CREATE TABLE bell_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  json_spec TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, color TEXT DEFAULT '#1976d2');
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE day_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  bell_template_id INTEGER,
  is_holiday INTEGER DEFAULT 0,
  note TEXT,
  FOREIGN KEY (bell_template_id) REFERENCES bell_templates(id) ON DELETE SET NULL
);
CREATE TABLE bell_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  action TEXT NOT NULL, -- OPEN/CLOSE/TRIGGER
  duration_ms INTEGER,
  result TEXT NOT NULL,
  message TEXT
);
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  body TEXT,
  priority TEXT DEFAULT 'NORMAL',
  start_ts TEXT,
  end_ts TEXT,
  is_active INTEGER DEFAULT 1
);
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mode TEXT DEFAULT 'SHUFFLE', -- or SEQUENTIAL
  crossfade_s INTEGER DEFAULT 0
);
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  duration_s INTEGER,
  order_index INTEGER,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
