CREATE TABLE login_rate_limit (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  CONSTRAINT login_rate_limit_pkey PRIMARY KEY (scope, key_hash),
  CONSTRAINT login_rate_limit_scope_check
    CHECK (scope IN ('email_ip', 'ip')),
  CONSTRAINT login_rate_limit_key_hash_check
    CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT login_rate_limit_failure_count_check
    CHECK (failure_count >= 0)
);

CREATE INDEX idx_login_rate_limit_blocked_until
  ON login_rate_limit (blocked_until);
