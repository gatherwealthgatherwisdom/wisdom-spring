// Secrets stay in .env.production (gitignored). Do not put API keys here.
// Shared Ubuntu: join the machine-wide PM2 daemon (same `pm2 list` as other sites).
// Name is spring-api only. Never `pm2 kill` or `pm2 reload all`. See docs/DEPLOY.md.
const { join } = require("node:path");

const cwd = join(__dirname, "..");
const API_PORT = 3009;
const tsxLoader = join(cwd, "apps/api/node_modules/tsx/dist/loader.mjs");

const sharedEnv = {
  PORT: String(API_PORT),
  HOST: "127.0.0.1",
  WORKER_EMBEDDED: "true",
};

module.exports = {
  apps: [
    {
      name: "spring-api",
      cwd,
      script: "apps/api/src/main.ts",
      interpreter: "node",
      interpreter_args: `--import ${tsxLoader}`,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      kill_timeout: 8000,
      max_restarts: 10,
      exp_backoff_restart_delay: 200,
      max_memory_restart: "512M",
      wait_ready: true,
      listen_timeout: 40000,
      out_file: "logs/spring-api-out.log",
      error_file: "logs/spring-api-error.log",
      env: sharedEnv,
      env_development: {
        NODE_ENV: "development",
        ...sharedEnv,
      },
      env_production: {
        NODE_ENV: "production",
        ...sharedEnv,
      },
    },
  ],
};
