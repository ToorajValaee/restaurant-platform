#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.production}"

docker compose --env-file "$ENV_FILE" run --rm app npm run db:migrate
docker compose --env-file "$ENV_FILE" up -d
