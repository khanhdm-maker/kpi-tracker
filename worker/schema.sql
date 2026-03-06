CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'member',
  team_id     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  leader_id   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS progress (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  year        INTEGER NOT NULL DEFAULT 2026,
  month       INTEGER NOT NULL,
  day         INTEGER,
  revenue     REAL,
  cost        REAL,
  profit      REAL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, year, month, day)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id, year);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);