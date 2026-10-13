# Self-hosted production deployment

The production stack runs Caddy, the Next.js frontend, NestJS backend,
PostgreSQL, and Garage on one Docker host. Only Caddy publishes host ports.

## VM requirements

- A Linux VM with Docker Engine and the Docker Compose v2 plugin
- Ports 80/TCP, 443/TCP, and 443/UDP open in the firewall
- Two DNS records pointing to the VM:
  - the application domain, for example `shelter.example.com`
  - the object-storage domain, for example `storage.shelter.example.com`

Garage is configured as a single-node store. Its volume must be backed up; a
single VM provides persistence, but not redundancy.

## Configure

Copy `.env.production.example` to `.env.production` and replace every sample
secret and domain. The `.env.production` file is ignored by Git.

Generate cryptographically random values. Garage requires:

- `GARAGE_RPC_SECRET`: 32 random bytes encoded as 64 hexadecimal characters
- `GARAGE_ACCESS_KEY`: `GK` followed by 32 hexadecimal characters
- `GARAGE_SECRET_KEY`: 32 random bytes encoded as 64 hexadecimal characters

Keep `POSTGRES_PASSWORD` URL-safe because Compose places it in
`DATABASE_URL`. Set the Google OAuth values expected by the current backend and
register this redirect URI with Google:

```text
https://<APP_DOMAIN>/auth/google/callback
```

## Deploy

From the repository root on the VM:

```text
docker compose --env-file .env.production -f compose.prod.yml config
docker compose --env-file .env.production -f compose.prod.yml build
docker compose --env-file .env.production -f compose.postgres.yml up -d --wait postgres
DATABASE_URL="postgresql://shelter:<password>@127.0.0.1:5432/shelter" sh ./backend/scripts/migrate.sh
docker compose --env-file .env.production -f compose.prod.yml up -d caddy backend frontend
docker compose --env-file .env.production -f compose.prod.yml ps
```

Caddy obtains and renews public TLS certificates automatically.

PostgreSQL is attached to both `public` and the internal `private` Compose
networks, and its port is published on all host interfaces (default host port
`5432`; override with `POSTGRES_PORT`). The scripts connect directly to
`127.0.0.1`. Restrict port 5432 with your host firewall before exposing the
server to untrusted networks. Containers on either Compose network can also
connect to PostgreSQL.

On the first deployment, create the initial `admin@shelter.local` account:

```text
DATABASE_URL="postgresql://shelter:<password>@127.0.0.1:5432/shelter" SEED_ADMIN_PASSWORD="<seed-admin-password>" sh ./backend/scripts/seed.sh
```

The seed is idempotent, but running it again resets that admin account to
`SEED_ADMIN_PASSWORD`, so it is not part of normal startup. Run it only after
migrations have completed.

Inspect service output with:

```text
docker compose --env-file .env.production -f compose.prod.yml logs -f
```

## Update

Pull the new source and run:

```text
docker compose --env-file .env.production -f compose.prod.yml build
docker compose --env-file .env.production -f compose.postgres.yml up -d --wait postgres
DATABASE_URL="postgresql://shelter:<password>@127.0.0.1:5432/shelter" sh ./backend/scripts/migrate.sh
docker compose --env-file .env.production -f compose.prod.yml up -d --remove-orphans caddy backend frontend
```

For a local source deployment, build the images, run the migration command
above, then start the app services. The GitHub Actions workflow instead builds
and pushes immutable commit-SHA-tagged app images once. The migration job starts
only Postgres from `compose.postgres.yml`, then runs `backend/scripts/migrate.sh`
directly on the self-hosted runner using Node.js 22. If the `seed_admin`
workflow input is enabled, that script also calls `backend/scripts/seed.sh`
after migrations. Both scripts use the same installed dependencies. Deploy
only pulls the built app images and uses `up --no-build`.

## GitHub Actions deployment

`.github/workflows/deploy.yml` has three jobs for every push to `main`:

1. `build` runs on GitHub-hosted Ubuntu, builds immutable frontend and backend
   images, and pushes them to GHCR with the commit SHA as the image tag.
2. `migrate` runs the checked-in shell script against the host-published
   PostgreSQL port.
3. `deploy` pulls the built app images, starts `compose.prod.yml` without
   building, and verifies service health. An explicitly requested seed runs
   during the migration job, before deployment.

The deployment host does not build application images. Its runner account must
be a member of the `docker` group and able to invoke `docker` and
`docker compose`. Membership in that group effectively grants root access, so
protect the production GitHub Environment and do not deploy untrusted pull
requests. The runner also requires Bash and `curl`. Only one production
deployment runs at a time.

## Production backups

`.github/workflows/backup.yml` runs daily at 03:17 UTC and can also be started
manually. It writes a custom-format PostgreSQL dump and an archive of the Garage
data volume to an independent Restic repository on S3-compatible storage.
Restic encrypts and deduplicates the data. Garage is stopped briefly while its
volume is archived and is restarted even if the archive step fails. The runner
needs enough free disk space for temporary plaintext backup files.

Configure these production Environment Variables:

- `BACKUP_S3_ENDPOINT` (for example, `https://s3.example.com`)
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_REGION` (optional; defaults to `us-east-1`)
- `BACKUP_S3_PREFIX` (optional; defaults to `shelter/production`)

Configure these production Environment Secrets:

- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`
- `BACKUP_RESTIC_PASSWORD` (keep this separately from the repository)

Use credentials scoped to the repository prefix with list, read, write, and
delete permissions (Restic needs delete access to prune). Each run checks the
repository and keeps 7 daily, 4 weekly, and 12 monthly snapshots; Restic prunes
data no longer needed by those snapshots. Do not apply an S3 lifecycle rule that
deletes Restic repository objects. Keep `BACKUP_RESTIC_PASSWORD` separately,
never change it without migrating the repository key, and periodically test
restoring both files with `restic snapshots` and `restic restore`.

After installing Docker, grant the runner access and restart its service so the
new group membership is applied:

```text
sudo usermod -aG docker github-runner
cd /home/github-runner/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

Verify this as `github-runner` before running the workflow:

```text
docker version
docker compose version
```

Create a GitHub Environment named `production` and configure these Environment
Variables:

- `APP_DOMAIN`
- `STORAGE_DOMAIN`
- `GOOGLE_CLIENT_ID` (optional; leave unset to disable Google sign-in)
- `HTTP_PORT` (optional; defaults to `80`)
- `HTTPS_PORT` (optional; defaults to `443`)
- `POSTGRES_USER` (optional; defaults to `shelter`)
- `POSTGRES_DB` (optional; defaults to `shelter`)
- `POSTGRES_PORT` (optional host port; defaults to `5432`)
- `SESSION_TTL_HOURS` (optional; defaults to `168`)
- `GARAGE_BUCKET` (optional; defaults to `shelter`)
- `GOOGLE_CALLBACK_URL` (optional; derived from `APP_DOMAIN`)
- `ALLOWED_GOOGLE_DOMAIN` (optional)

Configure these Environment Secrets:

- `POSTGRES_PASSWORD` (URL-safe)
- `SESSION_SECRET`
- `GARAGE_RPC_SECRET`
- `GARAGE_ACCESS_KEY`
- `GARAGE_SECRET_KEY`
- `GOOGLE_CLIENT_SECRET` (optional; leave unset to disable Google sign-in)
- `SEED_ADMIN_PASSWORD` (required only when `seed_admin` is enabled)

The workflow writes values to temporary runner files without logging them and
deletes them when each step exits. Migration, deployment, and optional seeding
are separate jobs. Do not use `compose.local.yml` for an actual environment.

The `workflow_dispatch` trigger has a `seed_admin` option. Enable it only for
the first deployment or when intentionally resetting `admin@shelter.local` to
`SEED_ADMIN_PASSWORD`. Seeding occurs after migrations and before app deploy.

## Back up

Back up both stateful services. A database dump alone does not include photos.

Create a PostgreSQL dump:

```text
docker compose --env-file .env.production -f compose.prod.yml exec -T postgres pg_dump -U shelter -d shelter -Fc > shelter.dump
```

Use the actual database user and name if they differ. For Garage, use a
volume-aware backup tool or stop Garage briefly and archive the
`shelter_garage-data` container volume. Store backups outside this VM and test the
restore procedure regularly. Caddy's volume may also be backed up, but its TLS
state can be recreated.

## Verify

- `https://<APP_DOMAIN>` loads the frontend.
- `https://<APP_DOMAIN>/health` returns backend status JSON.
- `https://<APP_DOMAIN>/api/docs` loads the API documentation.
- Login, photo upload, and photo display work through HTTPS.

PostgreSQL, Garage, frontend, and backend ports intentionally are not exposed
on the VM. Administrative access should use `docker compose exec` over SSH.
