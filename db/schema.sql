-- TechSiege registration schema.
-- Apply with: npm run db:migrate   (reads db/schema.sql against DATABASE_URL)
-- Requires PostgreSQL 13+ (gen_random_uuid is built-in).
--
-- These tables live in the default `public` schema. The separate `ops/` app
-- keeps its own `ops` schema in the same database and imports from here with
-- `npm run db:sync-registrations` over in that app.

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
