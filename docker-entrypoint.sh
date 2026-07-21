#!/bin/sh
set -e

# Apply pending migrations up front. The jsvm onBootstrap hooks (demo seed in
# pb_hooks/seed_demo.pb.js) fire BEFORE automigrations on a fresh database,
# so later bootstraps (superuser upsert / serve) must already see the schema.
/pb/pocketbase migrate up \
  --dir /pb/pb_data \
  --migrationsDir /pb/pb_migrations \
  --hooksDir /pb/pb_hooks || true

# Optional: create/update the superuser from env vars on first start, so the
# whole setup works without shell access. Otherwise PocketBase prints a
# one-time installer link to the logs.
if [ -n "$PB_SUPERUSER_EMAIL" ] && [ -n "$PB_SUPERUSER_PASSWORD" ]; then
  /pb/pocketbase superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" \
    --dir /pb/pb_data \
    --migrationsDir /pb/pb_migrations \
    --hooksDir /pb/pb_hooks || true
fi

exec /pb/pocketbase serve \
  --http "0.0.0.0:8090" \
  --dir /pb/pb_data \
  --publicDir /pb/pb_public \
  --migrationsDir /pb/pb_migrations \
  --hooksDir /pb/pb_hooks
