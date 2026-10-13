#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
npm ci
npx prisma migrate deploy

if [ "${SEED_ADMIN:-false}" = "true" ]; then
  SEED_DEPS_INSTALLED=true sh ./scripts/seed.sh
fi
