$BackupS3Endpoint = "s3.eu-central-003.backblazeb2.com"
$BackupS3Bucket = "shelter-backup"
$BackupS3Prefix = "shelter/production"
$BackupS3Region = "eu-central-003"
$BackupS3AccessKeyId = "<INSERT_ACCESS_KEY_ID>"
$BackupS3SecretAccessKey = "<INSERT_SECRET_ACCESS_KEY>"
$ResticPassword = "<INSERT_RESTIC_PASSWORD>"
$Snapshot = "latest"

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Invoke-ExternalCommand {
    param([Parameter(Mandatory)][scriptblock]$Command, [Parameter(Mandatory)][string]$FailureMessage)

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

foreach ($command in 'podman') {
    if ($null -eq (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command was not found: $command"
    }
}

$postgresUser = "shelter_user"
$postgresDatabase = "shelter"
$env:RESTIC_REPOSITORY = "s3:$BackupS3Endpoint/$BackupS3Bucket/$BackupS3Prefix"
$env:RESTIC_PASSWORD = $ResticPassword
$env:AWS_ACCESS_KEY_ID = $BackupS3AccessKeyId
$env:AWS_SECRET_ACCESS_KEY = $BackupS3SecretAccessKey
$env:AWS_DEFAULT_REGION = $BackupS3Region

$restoreDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("shelter-restore-" + [guid]::NewGuid())

try {
    New-Item -ItemType Directory -Path $restoreDirectory | Out-Null
    $restic = @(
        'run', '--rm',
        '--env', 'RESTIC_REPOSITORY',
        '--env', 'RESTIC_PASSWORD',
        '--env', 'AWS_ACCESS_KEY_ID',
        '--env', 'AWS_SECRET_ACCESS_KEY',
        '--env', 'AWS_DEFAULT_REGION',
        '--volume', "${restoreDirectory}:/restore",
        'docker.io/restic/restic:0.17.3'
    )
    Invoke-ExternalCommand { podman @restic restore $Snapshot --target /restore } "Restic could not restore snapshot '$Snapshot'."

    $postgresDump = Get-ChildItem -LiteralPath $restoreDirectory -Filter 'postgres.dump' -Recurse -File
    $garageArchive = Get-ChildItem -LiteralPath $restoreDirectory -Filter 'garage-data.tar.gz' -Recurse -File
    if ($postgresDump.Count -ne 1 -or $garageArchive.Count -ne 1) {
        throw 'The snapshot must contain exactly one postgres.dump and one garage-data.tar.gz file.'
    }

    $garageVolumes = @(podman volume ls --filter 'label=com.docker.compose.project=backend' --filter 'label=com.docker.compose.volume=garage-data' --format '{{.Name}}')
    if ($garageVolumes.Count -ne 1) {
        throw 'Expected exactly one Garage data volume for the shelter Compose project.'
    }
    $garageVolume = $garageVolumes[0].Trim()

    $postgresContainers = @(podman compose ps -q postgres)
    if ($postgresContainers.Count -ne 1) {
        throw 'The PostgreSQL container was not found after startup.'
    }
    $postgresContainer = $postgresContainers[0].Trim()

    Invoke-ExternalCommand { podman cp $postgresDump.FullName "${postgresContainer}:/tmp/postgres.dump" } 'Could not copy the PostgreSQL dump into the database container.'
    Invoke-ExternalCommand { podman exec $postgresContainer pg_restore --clean --if-exists --no-owner --no-privileges -U $postgresUser -d $postgresDatabase /tmp/postgres.dump } 'Could not restore the PostgreSQL dump.'
    Invoke-ExternalCommand {
        podman run --rm --volume "${garageVolume}:/data" --volume "$($garageArchive.DirectoryName):/backup:ro" docker.io/library/alpine:3.21 sh -c 'rm -rf /data/* /data/.[!.]* /data/..?*; tar -xzf /backup/garage-data.tar.gz -C /data'
    } 'Could not restore the Garage data volume.'
    Invoke-ExternalCommand { docker-compose up -d --wait } 'Could not start the production stack after restoration.'
}
finally {
    Remove-Item -LiteralPath $restoreDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
