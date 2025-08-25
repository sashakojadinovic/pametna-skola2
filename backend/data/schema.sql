/**
 * File: initial.sql
 * Path: /src/db/migrations
 * Author: Saša Kojadinović
 */

BEGIN;

-- ===========================
-- Core tables
-- ===========================

CREATE TABLE IF NOT EXISTS bell_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1976d2',
  json_spec TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- trigger za automatsko osvežavanje updated_at pri izmeni
CREATE TRIGGER IF NOT EXISTS trg_bell_templates_updated_at
AFTER UPDATE ON bell_templates
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE bell_templates
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'SHUFFLE' CHECK (mode IN ('SHUFFLE','SEQUENTIAL')),
  crossfade_s INTEGER NOT NULL DEFAULT 0 CHECK (crossfade_s >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,         -- tačno jedna može biti podrazumevana
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- trigger za automatsko osvežavanje updated_at pri izmeni
CREATE TRIGGER IF NOT EXISTS trg_playlists_updated_at
AFTER UPDATE ON playlists
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE playlists
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Trigeri koji obezbeđuju da postoji najviše jedna default plejlista
CREATE TRIGGER IF NOT EXISTS trg_playlists_only_one_default_ins
AFTER INSERT ON playlists
FOR EACH ROW
WHEN NEW.is_default = 1
BEGIN
  UPDATE playlists SET is_default = 0 WHERE id <> NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_playlists_only_one_default_upd
AFTER UPDATE OF is_default ON playlists
FOR EACH ROW
WHEN NEW.is_default = 1
BEGIN
  UPDATE playlists SET is_default = 0 WHERE id <> NEW.id;
END;

CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  duration_s INTEGER,
  order_index INTEGER,                             -- koristi se za SEQUENTIAL mod
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Redosled numera po plejlisti (dozvoljava NULL order_index, ali zabranjuje duplikate ne-NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_playlist_order
  ON tracks(playlist_id, order_index);

CREATE TABLE IF NOT EXISTS day_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,                       -- YYYY-MM-DD
  bell_template_id INTEGER,
  playlist_id INTEGER,                             -- ⬅️ NOVO: bira se per-dan (fallback: default plejlista)
  is_holiday INTEGER DEFAULT 0,
  note TEXT,
  FOREIGN KEY (bell_template_id) REFERENCES bell_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bell_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  action TEXT NOT NULL,                            -- OPEN/CLOSE/TRIGGER
  duration_ms INTEGER,
  result TEXT NOT NULL,
  message TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  body TEXT,
  priority TEXT DEFAULT 'NORMAL',
  start_ts TEXT,
  end_ts TEXT,
  is_active INTEGER DEFAULT 1
);

-- indeks za brza aktivna pretraživanja po vremenu
CREATE INDEX IF NOT EXISTS idx_announcements_active_time
  ON announcements(is_active, start_ts, end_ts);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

COMMIT;
