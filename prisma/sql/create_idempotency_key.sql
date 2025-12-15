-- Create IdempotencyKey table used by server-side idempotency store
-- Safe to run repeatedly (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "key" text PRIMARY KEY,
  "expires_at" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_idempotency_expires" ON "IdempotencyKey" ("expires_at");
