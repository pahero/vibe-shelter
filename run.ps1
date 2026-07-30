Set-Location "$PSScriptRoot"

npm install

Set-Location "$PSScriptRoot/backend"

podman compose up -d --wait
if (-not $?) {
    throw "Container did not start."
}

npm install
if (-not $?) {
    throw "Backend installation failed."
}
npx prisma generate
if (-not $?) {
    throw "prisma generate failed."
}
npx prisma migrate deploy
if (-not $?) {
    throw "Backend migration failed."
}

npm run db:seed
if (-not $?) {
    throw "Backend seed failed."
}

Set-Location "$PSScriptRoot/frontend"
npm install
if (-not $?) {
    throw "Frontend installation failed."
}

Set-Location $PSScriptRoot
npm run dev