#!/bin/bash
# Local demo stack — API.
#
# The demo is a *second* organization, so it needs subdomain tenancy: in single
# tenancy every path resolves to the one default org and the demo is
# unreachable. lvh.me (and every subdomain of it) resolves to 127.0.0.1, so
# demo.lvh.me works locally with no hosts-file editing.
#
# These are exported rather than left in .env because config.py reads the
# environment while parsing, and multi tenancy is rejected outright for a
# localhost domain.
#
# Secrets are generated on first run into .demo-secrets (gitignored) rather
# than written here. A signing key committed to the repository is a signing key
# every deployment that copies this file shares, however clearly it is labelled
# dev-only.
set -euo pipefail
cd "$(dirname "$0")"

SECRETS_FILE="../../.demo-secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "Generating local demo secrets in $(cd .. && pwd)/../.demo-secrets"
  {
    echo "FUNERALACADEMY_AUTH_JWT_SECRET_KEY=$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')"
    echo "COLLAB_INTERNAL_KEY=$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')"
    echo "FUNERALACADEMY_INITIAL_ADMIN_PASSWORD=$(python3 -c 'import secrets;print(secrets.token_urlsafe(12))')"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  echo "Admin password: $(grep FUNERALACADEMY_INITIAL_ADMIN_PASSWORD "$SECRETS_FILE" | cut -d= -f2)"
fi
set -a
# shellcheck disable=SC1090
. "$SECRETS_FILE"
set +a

export FUNERALACADEMY_SQL_CONNECTION_STRING="postgresql+asyncpg://funeralacademy:funeralacademy@localhost:5432/funeralacademy"
export FUNERALACADEMY_REDIS_CONNECTION_STRING="redis://localhost:6379/0"
export FUNERALACADEMY_DEVELOPMENT_MODE=true

export FUNERALACADEMY_TENANCY=multi
export FUNERALACADEMY_DOMAIN="lvh.me:3010"
export FUNERALACADEMY_FRONTEND_DOMAIN="lvh.me:3010"
export FUNERALACADEMY_COOKIE_DOMAIN=".lvh.me"
# Multi tenancy is gated on "Enterprise Edition available OR SaaS mode", and
# the demo needs nothing from the Enterprise Edition, so SaaS is the simpler
# switch to flip for a local run.
export FUNERALACADEMY_SAAS=true

export FUNERALACADEMY_DEMO_ENABLED=1
export FUNERALACADEMY_DEMO_SLUG=demo
export FUNERALACADEMY_DEMO_REFRESH_MINUTES=10

export FUNERALACADEMY_INITIAL_ADMIN_EMAIL=admin@school.dev

exec uv run uvicorn app:app --host 0.0.0.0 --port 1348 --log-level info
