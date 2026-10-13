-- Money is bigint minor units plus an ISO 4217 currency: 5000 USD = $50.00. Never float, never numeric-as-text.
CREATE TABLE payments (
  id             uuid        PRIMARY KEY,
  order_id       text        NOT NULL,
  customer_id    text        NOT NULL,
  merchant_id    text        NOT NULL,
  amount         bigint      NOT NULL CHECK (amount > 0),
  currency       char(3)     NOT NULL,
  status         text        NOT NULL CHECK (status IN ('created', 'processing', 'requires_action', 'unknown',
                               'succeeded', 'failed', 'canceled', 'partially_refunded', 'refunded')),
  refunded       bigint      NOT NULL DEFAULT 0 CHECK (refunded >= 0 AND refunded <= amount),
  psp_payment_id text        UNIQUE,
  version        int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- At most one live payment per order, even if a client forgets its key. A decline frees the order for a new attempt.
CREATE UNIQUE INDEX payments_one_live_per_order ON payments (order_id) WHERE status NOT IN ('failed', 'canceled');
CREATE INDEX payments_stuck ON payments (updated_at) WHERE status IN ('processing', 'unknown');   -- the recovery job's queue

CREATE TABLE idempotency_keys (
  customer_id   text        NOT NULL,
  key           text        NOT NULL,                  -- client-generated, one per checkout attempt
  request_hash  text        NOT NULL,                  -- same key + different body → 422
  status        text        NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'done')),
  payment_id    uuid        REFERENCES payments (id),
  response_code int,
  response_body jsonb,                                 -- replayed byte for byte on a retry
  created_at    timestamptz NOT NULL DEFAULT now(),    -- purge after 24 hours or more
  PRIMARY KEY (customer_id, key)
);

CREATE TABLE refunds (
  id            uuid        PRIMARY KEY,               -- also the PSP idempotency key for the refund
  payment_id    uuid        NOT NULL REFERENCES payments (id),
  amount        bigint      NOT NULL CHECK (amount > 0),
  status        text        NOT NULL,
  psp_refund_id text        UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Double-entry ledger: append-only. Mistakes are fixed with new, reversing transactions.
CREATE TABLE accounts (
  id       text    PRIMARY KEY,                        -- 'cash_at_psp', 'merchant_payable:m_42'
  type     text    NOT NULL CHECK (type IN ('asset', 'liability', 'revenue', 'expense')),
  currency char(3) NOT NULL
);
CREATE TABLE ledger_transactions (
  id         bigserial   PRIMARY KEY,
  source     text        NOT NULL UNIQUE,              -- 'pay_…:charge', 'rf_…:refund': each business event posts once
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ledger_entries (
  id             bigserial   PRIMARY KEY,
  transaction_id bigint      NOT NULL REFERENCES ledger_transactions (id),
  account_id     text        NOT NULL REFERENCES accounts (id),
  amount         bigint      NOT NULL CHECK (amount <> 0),   -- + debit, − credit; each transaction sums to 0
  currency       char(3)     NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_by_account ON ledger_entries (account_id, id);
-- The posting code rejects Σ ≠ 0; a deferred constraint trigger can enforce it in the database as well.
REVOKE UPDATE, DELETE ON ledger_transactions, ledger_entries FROM payments_app;

CREATE TABLE webhook_events (
  event_id    text        PRIMARY KEY,                 -- the PSP's id: a redelivery inserts nothing
  type        text        NOT NULL,
  payload     jsonb       NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox (
  id           bigserial   PRIMARY KEY,
  topic        text        NOT NULL,                   -- 'payment.succeeded'
  key          text        NOT NULL,                   -- partition key: the payment id
  payload      jsonb       NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX outbox_unpublished ON outbox (id) WHERE published_at IS NULL;
