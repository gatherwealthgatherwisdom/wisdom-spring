export const LOG_REDACT = {
  paths: [
    "content",
    "messages",
    "prompt",
    "password",
    "passwordHash",
    "refreshToken",
    "req.body.content",
    "req.body.password",
    "req.body.refreshToken",
    "req.headers.authorization",
  ],
  censor: "[redacted]",
};
