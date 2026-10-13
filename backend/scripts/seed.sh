#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
if [ -z "${SEED_ADMIN_PASSWORD:-}" ]; then
  echo "SEED_ADMIN_PASSWORD is required" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
if [ "${SEED_DEPS_INSTALLED:-false}" != "true" ]; then
  npm ci
fi
npx prisma generate
npx prisma db seed
