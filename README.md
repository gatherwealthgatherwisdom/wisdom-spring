# 智泉 / Wisdom Spring

Consumer chat for 中盈紫達集團（Gather Wealth Gather Wisdom Group）. Each user turn draws one model from a Hong Kong–safe OpenRouter pool. The product spec lives in [`docs/WISDOM_SPRING_PRODUCT_AND_DEV.md`](docs/WISDOM_SPRING_PRODUCT_AND_DEV.md).

## Requirements

- Node.js 20+
- pnpm 9
- MySQL 8+ and Redis 7

## Boot

```bash
cp .env.example .env
# fill JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, OPENROUTER_API_KEY, ADMIN_EMAIL

docker compose -f infra/docker-compose.yml up -d
pnpm install
pnpm db:deploy
pnpm --filter @spring/api catalog:sync
pnpm --filter @spring/api catalog:probe
pnpm dev
```

| App | URL |
|---|---|
| API | http://localhost:3000 |
| Admin | http://localhost:5173 |
| Mobile | Expo, `apps/mobile` |

`PROBE_ASSUMES_HK_EGRESS=true` only on a host whose traffic exits from Hong Kong. A probe from anywhere else records health and can mark a slug blocked on HTTP 403, and it does not promote `UNKNOWN` to `HK_SAFE`.

Registering the address in `ADMIN_EMAIL` creates the first admin. Money on the wire is integer USD micros. The company OpenRouter key stays on the server.

## Checks

```bash
pnpm typecheck
pnpm test
```

API integration tests use `TEST_DATABASE_URL` when it is set, otherwise `mysql://spring:spring@127.0.0.1:3306/spring_test`, plus Redis at `127.0.0.1:6379`. Compose creates `spring_test` on first boot.

For a local draw before a Hong Kong probe has run:

```bash
SEED_TRUST_ALLOWLIST=true pnpm --filter @spring/api exec tsx src/scripts/seed-pool.ts
```

That marks three allowlisted slugs `HK_SAFE` for a demo on a machine that is not exiting from Hong Kong. Do not use it in production.
