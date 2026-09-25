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
docker compose --env-file .env.production -f compose.prod.yml up -d
docker compose --env-file .env.production -f compose.prod.yml ps
```

The one-shot `migrate` service applies Prisma migrations before the backend is
started. It is expected to show an exited status with exit code 0 afterward.
Caddy obtains and renews public TLS certificates automatically.

On the first deployment, create the initial `admin@shelter.local` account:

```text
docker compose --env-file .env.production -f compose.prod.yml --profile bootstrap run --rm seed
```

The seed is idempotent, but running it again resets that admin account to
`SEED_ADMIN_PASSWORD`, so it is not part of normal startup.

Inspect service output with:

```text
docker compose --env-file .env.production -f compose.prod.yml logs -f
```

## Update

Pull the new source and run:

```text
docker compose --env-file .env.production -f compose.prod.yml build
docker compose --env-file .env.production -f compose.prod.yml up -d --remove-orphans
```

Compose reruns the migration service and only starts the new backend after the
migrations complete successfully.

## GitHub Actions deployment

`.github/workflows/deploy.yml` has two jobs for every push to `main`:

1. `build` runs on GitHub-hosted Ubuntu, builds immutable frontend, backend,
   and migration images, and pushes them to GHCR with the commit SHA as the
   image tag.
2. `deploy` runs on the Ubuntu x64 self-hosted runner, pulls those images,
   starts `compose.prod.yml`, and verifies migrations and service health.

The deployment host does not build application images. Its runner account must
be a member of the `docker` group and able to invoke `docker` and
`docker compose`. Membership in that group effectively grants root access, so
protect the production GitHub Environment and do not deploy untrusted pull
requests. The runner also requires Bash and `curl`. Only one production
deployment runs at a time.

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
- `GOOGLE_CLIENT_ID`
- `HTTP_PORT` (optional; defaults to `80`)
- `HTTPS_PORT` (optional; defaults to `443`)
- `POSTGRES_USER` (optional; defaults to `shelter`)
- `POSTGRES_DB` (optional; defaults to `shelter`)
- `SESSION_TTL_HOURS` (optional; defaults to `168`)
- `GARAGE_BUCKET` (optional; defaults to `shelter`)
- `GOOGLE_CALLBACK_URL` (optional; derived from `APP_DOMAIN`)
- `ALLOWED_GOOGLE_DOMAIN` (optional)

Configure these Environment Secrets:

- `POSTGRES_PASSWORD` (URL-safe)
- `SESSION_SECRET`
- `SEED_ADMIN_PASSWORD`
- `GARAGE_RPC_SECRET`
- `GARAGE_ACCESS_KEY`
- `GARAGE_SECRET_KEY`
- `GOOGLE_CLIENT_SECRET`

The workflow writes these values to a temporary runner file without logging
them, deploys `compose.prod.yml`, verifies migrations and service health, and
deletes the file when the deployment step exits. Do not use `compose.local.yml`
for an actual environment.

The `workflow_dispatch` trigger has a `seed_admin` option. Enable it only for
the first deployment or when intentionally resetting `admin@shelter.local` to
`SEED_ADMIN_PASSWORD`.

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
