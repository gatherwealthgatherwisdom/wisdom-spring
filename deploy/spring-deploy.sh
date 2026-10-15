#!/usr/bin/env bash
# Recurring update for 智泉 on the shared Ubuntu host.
# Run as user app from anywhere: sudo -u app /home/app/wisdom-spring/deploy/spring-deploy.sh
# Does not touch nginx, MySQL, Redis, certbot, or other PM2 names.
set -euo pipefail

die() {
  echo "spring-deploy: $*" >&2
  exit 1
}

if [[ "$(id -u)" -eq 0 ]]; then
  die "run as app (sudo -u app), not root"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[[ -f package.json ]] || die "not a wisdom-spring checkout ($ROOT)"
grep -q '"name": "wisdom-spring"' package.json || die "package.json is not wisdom-spring"

origin="$(git remote get-url origin 2>/dev/null || true)"
[[ "$origin" == *wisdom-spring* ]] || die "git origin is not wisdom-spring ($origin)"

[[ -f .env.production ]] || die "missing .env.production (copy from .env.production.example on the host)"
[[ -f deploy/ecosystem.config.cjs ]] || die "missing deploy/ecosystem.config.cjs"

names="$(node -e 'const e=require("./deploy/ecosystem.config.cjs"); process.stdout.write(e.apps.map((a)=>a.name).join(","))')"
[[ "$names" == "spring-api" ]] || die "ecosystem must only name spring-api (got $names)"

echo "== git pull --ff-only"
git pull --ff-only

echo "== pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

DATABASE_URL="$(python3 - <<'PY'
from pathlib import Path
import sys
text = Path(".env.production").read_text(encoding="utf-8")
for raw in text.splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, _, value = line.partition("=")
    key = key.strip()
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    if key == "DATABASE_URL":
        sys.stdout.write(value)
        sys.exit(0)
sys.exit(1)
PY
)"
[[ -n "${DATABASE_URL}" ]] || die "DATABASE_URL missing in .env.production"
export DATABASE_URL

echo "== prisma generate / migrate deploy (database spring only)"
pnpm db:generate
pnpm db:deploy

mkdir -p logs data/generated data/uploads

echo "== admin production build"
VITE_API_URL=https://admin.spring.gwgwgroup-it.com pnpm --filter @spring/admin build
chmod -R a+rX apps/admin/dist

echo "== pm2 startOrReload --only spring-api"
pm2 startOrReload deploy/ecosystem.config.cjs --env production --only spring-api --update-env
pm2 save

echo "== health 127.0.0.1:3009"
curl -fsS --max-time 15 http://127.0.0.1:3009/health
echo
echo "spring-deploy: ok"
