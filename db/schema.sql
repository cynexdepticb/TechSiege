-- TechSiege registration schema (frontend / public schema).
-- Apply with: npm run db:migrate   (reads db/schema.sql against DATABASE_URL)
-- Requires PostgreSQL 13+ (gen_random_uuid is built-in).
--
-- These tables live in the default `public` schema. The separate `ops/` app
-- keeps its own `ops` schema in the same database and imports from here with
-- `npm run db:sync-registrations` over in that app.
--
-- Migration policy: this file is re-applied on every deploy, so every change
-- below must be idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DO
-- blocks). Never drop or rename a column here — add new ones and backfill.

CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name   VARCHAR(80)  NOT NULL,
  institution VARCHAR(160) NOT NULL,
  city        VARCHAR(100) NOT NULL DEFAULT '',
  track_id    VARCHAR(40)  NOT NULL,
  project_idea TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  is_lead    BOOLEAN NOT NULL DEFAULT false,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(254) NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  branch_year VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One email per event (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS members_email_unique ON members (lower(email));
CREATE INDEX IF NOT EXISTS members_team_idx ON members (team_id);

-- ─── Payment-verified registration (2026-09-27) ──────────────────────
-- Explicit status model. No boolean flags: payment and registration state are
-- separate columns so "paid but not confirmed" stays answerable.

-- Registration lifecycle: PAYMENT_PENDING → PAYMENT_VERIFICATION →
-- CONFIRMED | PAYMENT_REJECTED | RESUBMISSION_REQUIRED | CANCELLED.
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_code VARCHAR(16);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS registration_status VARCHAR(32) NOT NULL DEFAULT 'PAYMENT_PENDING';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) NOT NULL DEFAULT 'PENDING';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_screenshot_path TEXT NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_screenshot_mime VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_screenshot_size INT NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS verified_by VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS rejection_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS confirmation_email_status VARCHAR(16) NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill pre-payment rows: they were stored with no screenshot and no
-- verification, which is exactly PAYMENT_PENDING / PENDING.
-- team_code backfill is best-effort (NULL stays NULL for old rows; new rows
-- always get one from the app). Uniqueness enforced below for non-null codes.
UPDATE teams SET submitted_at = created_at WHERE submitted_at IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_registration_status_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_registration_status_check CHECK (
      registration_status IN ('PAYMENT_PENDING','PAYMENT_VERIFICATION','PAYMENT_REJECTED','RESUBMISSION_REQUIRED','CONFIRMED','CANCELLED')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_payment_status_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_payment_status_check CHECK (
      payment_status IN ('PENDING','VERIFIED','REJECTED')
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS teams_code_unique ON teams (team_code);
CREATE INDEX IF NOT EXISTS teams_status_idx ON teams (registration_status, payment_status);
CREATE INDEX IF NOT EXISTS teams_submitted_idx ON teams (submitted_at DESC);

ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- One ticket per member, generated ONLY after payment verification.
-- ticket_status: GENERATED → CHECKED_IN | CANCELLED. (NOT_GENERATED is the
-- absence of a row — no boolean needed.)
CREATE TABLE IF NOT EXISTS tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     VARCHAR(32) NOT NULL,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  qr_token      VARCHAR(128) NOT NULL,
  ticket_status VARCHAR(16) NOT NULL DEFAULT 'GENERATED',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  checked_in_by VARCHAR(120) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_status_check') THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (
      ticket_status IN ('GENERATED','CHECKED_IN','CANCELLED')
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_id_unique ON tickets (ticket_id);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_qr_unique ON tickets (qr_token);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_member_unique ON tickets (member_id);
CREATE INDEX IF NOT EXISTS tickets_team_idx ON tickets (team_id);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_path TEXT NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_status VARCHAR(32) NOT NULL DEFAULT 'PENDING';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

-- Audit log for every payment decision (verify / reject / resubmit / resend).
CREATE TABLE IF NOT EXISTS payment_decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  decision      VARCHAR(32) NOT NULL,
  reason        TEXT NOT NULL DEFAULT '',
  admin_identity VARCHAR(120) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_decisions_team_idx ON payment_decisions (team_id, created_at DESC);
