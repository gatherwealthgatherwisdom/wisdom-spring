# 首次部署（共用 Ubuntu）

部機 `43.231.0.69`（`app.gwgwgroup-it.com`）已有其他 Node／網站。呢份只加智泉，**唔** `pm2 kill` 全域 daemon、**唔** `pm2 reload all`、**唔**改其他 nginx vhost、**唔**裝第二個 nginx／MySQL／Redis／PM2。

| 公開 | 去邊 |
|---|---|
| `https://spring.gwgwgroup-it.com` | `127.0.0.1:3009`（PM2 `spring-api` fork ×1） |
| `https://admin.spring.gwgwgroup-it.com` | 靜態 `apps/admin/dist`；`/v1`、`/admin`、`/health` 反代 3009 |

目錄：`/home/app/wisdom-spring`。用戶：`app`。PM2 加入部機現有 `pm2-app` daemon（`PM2_HOME=/home/app/.pm2`），`pm2 list` 同其他站一齊出現。行程名只有 **`spring-api`**。`WORKER_EMBEDDED=true`，唔再開第二個 worker。

## 隔離（硬）

| 資源 | 智泉 | 唔好 |
|---|---|---|
| 目錄 | `/home/app/wisdom-spring` | 改其他 `/home/app/*` |
| Port | **3009**，bind `127.0.0.1` | 3000–3008（已佔：prod／king／rate／rate-cn／files／free-loan／forlucky／shakeeat／paansik） |
| PM2 | `spring-api`；`pm2 start/reload --only spring-api` | `pm2 kill`、`pm2 reload all`、`systemctl reload/restart pm2-*`（ExecStop=`pm2 kill`） |
| MySQL | 庫 `spring`；用戶 `spring@127.0.0.1`，只 `GRANT` `spring.*` | 共用業務用戶 `app@localhost`；改其他庫 |
| Redis | `redis://127.0.0.1:6379/3` | db2（盤析，約 9 萬 key） |
| nginx | 只加 `spring`、`admin.spring` 兩個 site | 改 `default_server` 或其他 vhost |
| 磁碟 | 上列目錄、`/var/log/nginx/spring*.log`、`/etc/logrotate.d/spring` | 其他 project 檔 |
| 密鑰 | 主機 `.env.production`（gitignore） | commit `.env` / `.env.production` |
| Compose | 唔用 | `infra/docker-compose.yml` 會撞部機 MySQL 3306 同 Redis 6379 |

公網 `IP:3009` 必須失敗。API 只經 nginx 443。

## 前置

- DNS A：`spring.gwgwgroup-it.com`、`admin.spring.gwgwgroup-it.com` → `43.231.0.69`
- 80／443 已開（現有站用緊就得）
- sudo、nginx、certbot 已裝
- Node **20**、pnpm **9.15.9**（同倉庫 `packageManager`）。共用機舊 PM2 daemon 對 cluster + tsx 不穩，API 用 **fork**
- 現成 MySQL 8 `:3306`、Redis `:6379`。唔好新裝第二個
- 用戶 `app` 已有 `gh auth git-credential`

```bash
ss -lptn | grep 3009
```

3009 被佔就停，先釋放或再傾 port。

## 1. 程式

```bash
sudo -u app git clone https://github.com/gatherwealthgatherwisdom/wisdom-spring.git /home/app/wisdom-spring
cd /home/app/wisdom-spring
node -v    # 要 v20
pnpm -v    # 要 9.15.x
```

## 2. MySQL、Redis、環境檔

```sql
CREATE DATABASE spring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spring'@'127.0.0.1' IDENTIFIED BY '改一組夠長嘅密碼';
GRANT ALL ON spring.* TO 'spring'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Redis 用 db **3**，避開盤析 db2。

```bash
cd /home/app/wisdom-spring
sudo -u app cp .env.production.example .env.production
sudo -u app nano .env.production
```

必填：`DATABASE_URL`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`（各 ≥16 字）、`OPENROUTER_API_KEY`、生產 OTP 嘅 `SMS_METEORSIS_*`。  
保持 `HOST=127.0.0.1`、`PORT=3009`、`REDIS_URL=redis://127.0.0.1:6379/3`、`APP_ORIGIN_ADMIN=https://admin.spring.gwgwgroup-it.com`、`PROBE_ASSUMES_HK_EGRESS=true`（呢部機香港出口）、`WORKER_EMBEDDED=true`、`ADMIN_PHONE=+85292578982`。

Admin 建置把 `VITE_API_URL` 寫死喺靜態檔；日常更新由 `deploy/spring-deploy.sh` 帶 `https://admin.spring.gwgwgroup-it.com`（同源，nginx 反代 `/v1` 同 `/admin`）。

Prisma CLI **唔會**自動讀 `.env.production`。用下面嘅更新腳本，或先 `export DATABASE_URL=...` 再 `pnpm db:generate`／`pnpm db:deploy`。

## 3. 加入現有 PM2 list

用全域 `pm2`（同 `files` / `rate` / `paansik-api` 嗰個），唔好開第二個 daemon，唔好 `export PM2_HOME`，**唔好**裝獨立 `*-pm2.service`。

```bash
cd /home/app/wisdom-spring
ss -lptn | grep 3009    # 要空
sudo -u app ./deploy/spring-deploy.sh
pm2 list
curl -sS http://127.0.0.1:3009/health
ss -lptn | grep 3009
```

`spring-deploy.sh` 會：拒絕 root → 確認 git remote 係 wisdom-spring → `git pull --ff-only` → `pnpm install --frozen-lockfile` → 只對庫 `spring` 做 `db:generate`／`db:deploy` → 建 admin → `pm2 startOrReload … --only spring-api` → `pm2 save` → `curl 127.0.0.1:3009/health`。失敗即停。腳本**無** nginx／mysql／certbot／`pm2 kill`。

健康檢查要 200。`pm2 list` 應同時見到其他站同 `spring-api`（fork ×1，online）。`ss` 只有 `127.0.0.1:3009`。

`WORKER_EMBEDDED=true` 開機會同步 OpenRouter 目錄，跟着 probe 一批（20）標 `HK_SAFE`。之後每小時再 probe。`https://spring.gwgwgroup-it.com/v1/pool` 有 DeepSeek／Qwen／Gemma 標籤先代表可以對話。等唔到可以手動：

```bash
sudo -Hu app bash -lc 'cd /home/app/wisdom-spring && NODE_ENV=production pnpm --filter @spring/api catalog:probe'
```

開機重啟靠部機現有 `pm2-app.service`。**禁止** `pm2 kill`、`systemctl restart pm2-app`、`systemctl restart pm2-root`。

## 4. nginx

```bash
sudo cp /home/app/wisdom-spring/deploy/nginx/spring.conf /etc/nginx/sites-available/spring
sudo cp /home/app/wisdom-spring/deploy/nginx/admin.spring.conf /etc/nginx/sites-available/admin.spring
sudo ln -s /etc/nginx/sites-available/spring /etc/nginx/sites-enabled/spring
sudo ln -s /etc/nginx/sites-available/admin.spring /etc/nginx/sites-enabled/admin.spring
sudo nginx -t && sudo systemctl reload nginx
```

只加呢兩個 site。唔改 `default_server`。`nginx -t` 失敗就唔好 reload。

對話 SSE（`POST /v1/messages`）要 `include deploy/nginx/proxy-sse.conf`（`proxy_buffering off`、`proxy_read_timeout 240s`）。nginx 預設 60 秒會對 App 回 504。

Admin site 必須反代 `/v1`、`/admin`、`/health`。後台路由係 `/admin/*`，唔止 `/v1`。

## 5. Let’s Encrypt

DNS 已指到呢部機之後：

```bash
sudo certbot --nginx \
  -d spring.gwgwgroup-it.com \
  -d admin.spring.gwgwgroup-it.com
```

跟提示填電郵、同意條款。certbot 會加 443 同 HTTP→HTTPS。續期：`sudo certbot renew --dry-run`。只為呢兩個名申請；唔好改其他證書。

## 6. Log 自動清理

```bash
sudo cp /home/app/wisdom-spring/deploy/logrotate/spring /etc/logrotate.d/spring
sudo logrotate -d /etc/logrotate.d/spring
```

PM2 日誌每日輪替、留 14 日、`copytruncate`，用 `su app app`。nginx `/var/log/nginx/spring*.log` 由系統 `/etc/logrotate.d/nginx` 處理。唔好 `pm2 install pm2-logrotate`。

## 日常更新

```bash
sudo -u app /home/app/wisdom-spring/deploy/spring-deploy.sh
```

改 nginx 設定檔之後先 `sudo nginx -t` 再 `sudo systemctl reload nginx`。改 `.env.production` 之後再跑一次腳本（`--update-env`）。

手機 Metro／Debug 預設 `http://localhost:3000`。Release 包預設 `https://spring.gwgwgroup-it.com`。要本機 Debug 打生產：`EXPO_PUBLIC_API_URL=https://spring.gwgwgroup-it.com` 再開 Metro。生產 OTP 走真實短訊，唔再係 `123456`。

EAS 設定喺 `apps/mobile/eas.json`。內部 APK（打生產 API）：

```bash
cd apps/mobile
eas build --platform android --profile preview
```

preview 用本機 `credentials.json`（gitignore）簽名。今次唔提交 App Store／Play。

Admin 後台 OTP 走 App 收件箱，唔走短訊。首次要用手機 App 以短訊登入 `ADMIN_PHONE` 並允許通知，之後先喺 `https://admin.spring.gwgwgroup-it.com` 收 OTP。

## 驗收

- `ss -lptn | grep 3009` 只有 `127.0.0.1:3009`
- 公網 `http://43.231.0.69:3009/health` 失敗
- `https://spring.gwgwgroup-it.com/health` → 200
- `https://admin.spring.gwgwgroup-it.com/` 開到後台登入頁
- `pm2 list` 其他站仍然 **online**，並多咗 `spring-api`
- `mysql`：其他庫原封；只有新庫 `spring`
- Redis `INFO keyspace`：db2 仍在；智泉用 db3

## 禁止

- `pm2 kill`、`pm2 reload all`、`pm2 delete all`
- `systemctl reload pm2-app` / `restart pm2-root`（會殺晒其他站）
- 改 `/etc/nginx/sites-enabled/default` 或其他 project 嘅 conf
- 喺呢部機跑 `docker compose`（`infra/docker-compose.yml`）
- 用 port 3000 或 Redis db2
- 用 MySQL 用戶 `app` 連智泉庫
- 把 `.env.production` 提交 git
