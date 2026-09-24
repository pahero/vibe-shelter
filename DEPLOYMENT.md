# Self-hosted production deployment

The production stack runs Caddy, the Next.js frontend, NestJS backend,
PostgreSQL, and Garage on one Podman or Docker host. Only Caddy publishes host
ports.

## VM requirements

- A Linux VM with Podman and a Compose provider (`podman compose`), or Docker
  Engine with Docker Compose v2
- Ports 80/TCP, 443/TCP, and 443/UDP open in the firewall
- Two DNS records pointing to the VM:
  - the application domain, for example `shelter.example.com`
  - the object-storage domain, for example `storage.shelter.example.com`

Garage is configured as a single-node store. Its volume must be backed up; a
single VM provides persistence, but not redundancy.

### Rootless Podman ports

Caddy needs public ports 80 and 443 for automatic certificates. Rootless
Podman commonly blocks ports below 1024. On a dedicated VM, allow rootless
processes to bind from port 80 by creating `/etc/sysctl.d/99-rootless-ports.conf`
with this content:

```text
net.ipv4.ip_unprivileged_port_start=80
```

Then apply it with `sudo sysctl --system`. Alternatively, run the stack with
rootful Podman, or forward public ports 80/443 to unprivileged ports and set
`HTTP_PORT`/`HTTPS_PORT` accordingly. Changing the ports without external
forwarding will prevent normal ACME certificate issuance.

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

From the repository root on the VM, using Podman:

```text
podman compose --env-file .env.production -f compose.prod.yml config
podman compose --env-file .env.production -f compose.prod.yml build
podman compose --env-file .env.production -f compose.prod.yml up -d
podman compose --env-file .env.production -f compose.prod.yml ps
```

The same commands work with Docker by replacing `podman compose` with
`docker compose`.

The one-shot `migrate` service applies Prisma migrations before the backend is
started. It is expected to show an exited status with exit code 0 afterward.
Caddy obtains and renews public TLS certificates automatically.

On the first deployment, create the initial `admin@shelter.local` account:

```text
podman compose --env-file .env.production -f compose.prod.yml --profile bootstrap run --rm seed
```

The seed is idempotent, but running it again resets that admin account to
`SEED_ADMIN_PASSWORD`, so it is not part of normal startup.

Inspect service output with:

```text
podman compose --env-file .env.production -f compose.prod.yml logs -f
```

For a rootless Podman deployment, enable user services at boot and Podman's
restart service (replace `<user>` with the deployment account):

```text
sudo loginctl enable-linger <user>
systemctl --user enable --now podman-restart.service
```

## Update

Pull the new source and run:

```text
podman compose --env-file .env.production -f compose.prod.yml build
podman compose --env-file .env.production -f compose.prod.yml up -d --remove-orphans
```

Compose reruns the migration service and only starts the new backend after the
migrations complete successfully.

## Back up

Back up both stateful services. A database dump alone does not include photos.

Create a PostgreSQL dump:

```text
podman compose --env-file .env.production -f compose.prod.yml exec -T postgres pg_dump -U shelter -d shelter -Fc > shelter.dump
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
on the VM. Administrative access should use `podman compose exec` over SSH
(`docker compose exec` when using Docker).
