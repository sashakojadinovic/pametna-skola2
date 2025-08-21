/**
 * File: package.json
 * Path: /
 * Author: Saša Kojadinović
 */
{
  "name": "pametna-skola-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js",
    "migrate": "node src/db/migrate.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "luxon": "^3.5.0",
    "rrule": "^2.8.1",
    "socket.io": "^4.7.5",
    "sqlite": "^5.1.6",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}

/**
 * File: .env.example
 * Path: /
 * Author: Saša Kojadinović
 */
# HTTP
PORT=3000
CORS_ORIGIN=http://localhost:5173

# TIMEZONE
TZ=Europe/Belgrade

# GPIO / RELAY
RELAY_PIN=18
RELAY_PULSE_MS=2500
MOCK_GPIO=true

# DATABASE
DB_FILE=./data/pametna_skola.db

/**
 * File: app.js
 * Path: /src
 * Author: Saša Kojadinović
 */
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { initDb } from './db/index.js';
import { initSocket } from './realtime/ws.js';
import { registerRoutes } from './routes.js';
import { bellScheduler } from './modules/bell/bell.service.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*'}));
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', now: new Date().toISOString() });
});

const server = http.createServer(app);
const io = initSocket(server);

// Bootstrap
const PORT = process.env.PORT || 3000;
const TZ = process.env.TZ || 'Europe/Belgrade';
process.env.TZ = TZ; // ensure Node uses school TZ

const db = await initDb();
await registerRoutes(app, db, io);
await bellScheduler.init({ db, io });

server.listen(PORT, () => {
  logger.info(`Backend listening on :${PORT} (TZ=${TZ})`);
});

/**
 * File: index.js
 * Path: /src/config
 * Author: Saša Kojadinović
 */
export const config = {
  tz: process.env.TZ || 'Europe/Belgrade',
  relayPin: Number(process.env.RELAY_PIN || 18),
  relayPulseMs: Number(process.env.RELAY_PULSE_MS || 2500),
  mockGpio: (process.env.MOCK_GPIO || 'false').toLowerCase() === 'true',
  dbFile: process.env.DB_FILE || './data/pametna_skola.db'
};

/**
 * File: index.js
 * Path: /src/db
 * Author: Saša Kojadinović
 */
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
  const dir = path.resolve(path.dirname(config.dbFile));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = await open({ filename: config.dbFile, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON;');
  const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations', 'initial.sql'), 'utf8');
  await db.exec(migrationSql);
  logger.info('SQLite initialized and migrated.');
  return db;
}

/**
 * File: migrate.js
 * Path: /src/db
 * Author: Saša Kojadinović
 */
import { initDb } from './index.js';
await initDb();
console.log('Migration completed');

/**
 * File: initial.sql
 * Path: /src/db/migrations
 * Author: Saša Kojadinović
 */
-- Core tables
CREATE TABLE IF NOT EXISTS bell_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  json_spec TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS day_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  bell_template_id INTEGER,
  is_holiday INTEGER DEFAULT 0,
  note TEXT,
  FOREIGN KEY (bell_template_id) REFERENCES bell_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bell_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  action TEXT NOT NULL, -- OPEN/CLOSE/TRIGGER
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

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mode TEXT DEFAULT 'SHUFFLE', -- or SEQUENTIAL
  crossfade_s INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  duration_s INTEGER,
  order_index INTEGER,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- triggers for timestamps
CREATE TRIGGER IF NOT EXISTS trg_bell_templates_updated
AFTER UPDATE ON bell_templates
FOR EACH ROW BEGIN
  UPDATE bell_templates SET updated_at = datetime('now') WHERE id = OLD.id;
END;

/**
 * File: ws.js
 * Path: /src/realtime
 * Author: Saša Kojadinović
 */
import { Server } from 'socket.io';

export function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN || '*' } });
  io.on('connection', (socket) => {
    socket.on('join', (room) => socket.join(room));
  });
  return io;
}

/**
 * File: time.js
 * Path: /src/utils
 * Author: Saša Kojadinović
 */
import { DateTime } from 'luxon';

export function nowTZ(tz) {
  return DateTime.now().setZone(tz || process.env.TZ || 'Europe/Belgrade');
}

export function parseTimeToday(tz, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return nowTZ(tz).set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/**
 * File: logger.js
 * Path: /src/utils
 * Author: Saša Kojadinović
 */
export const logger = {
  info: (...a) => console.log('[INFO]', ...a),
  warn: (...a) => console.warn('[WARN]', ...a),
  error: (...a) => console.error('[ERROR]', ...a)
};

/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

class MockRelay {
  constructor(pin) { this.pin = pin; }
  async pulse(durationMs) {
    logger.info(`(MOCK GPIO) Relay on pin ${this.pin} PULSE ${durationMs}ms`);
    await new Promise(r => setTimeout(r, durationMs));
    return true;
  }
}

let relayInstance = null;

export function getRelay() {
  if (relayInstance) return relayInstance;

  if (config.mockGpio) {
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  let Gpio = null;
  try {
    ({ Gpio } = require('pigpio'));
  } catch (e) {
    logger.warn('pigpio not available, falling back to MOCK GPIO');
  }

  if (!Gpio) {
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  class PigpioRelay {
    constructor(pin) {
      this.gpio = new Gpio(pin, { mode: Gpio.OUTPUT });
    }
    async pulse(durationMs) {
      this.gpio.digitalWrite(1);
      await new Promise(r => setTimeout(r, durationMs));
      this.gpio.digitalWrite(0);
      return true;
    }
  }

  relayInstance = new PigpioRelay(config.relayPin);
  return relayInstance;
}

/**
 * File: bell.service.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { DateTime } from 'luxon';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { nowTZ, parseTimeToday } from '../../utils/time.js';
import { getRelay } from './bell.gpio.js';

// JSON spec format (example):
// {
//   "rings": [
//     { "time": "08:00", "label": "Почетак 1." },
//     { "time": "08:45", "label": "Крај 1." },
//     ...
//   ]
// }

const state = {
  nextRingTs: null,
  nextLabel: null,
  timer: null,
  db: null,
  io: null
};

async function fetchTodayTemplate(db) {
  const today = nowTZ(config.tz).toFormat('yyyy-LL-dd');
  const row = await db.get(
    `SELECT ds.date, ds.is_holiday, bt.json_spec
     FROM day_schedule ds
     LEFT JOIN bell_templates bt ON bt.id = ds.bell_template_id
     WHERE ds.date = ?`,
    [today]
  );
  return row;
}

function computeTodayRings(json_spec) {
  if (!json_spec) return [];
  let spec;
  try { spec = JSON.parse(json_spec); } catch { return []; }
  const rings = Array.isArray(spec.rings) ? spec.rings : [];
  const list = rings.map((r) => ({
    ts: parseTimeToday(config.tz, r.time),
    label: r.label || ''
  }));
  return list.filter(x => x.ts > nowTZ(config.tz)).sort((a,b) => a.ts - b.ts);
}

async function scheduleNext(db, io) {
  clearTimeout(state.timer);
  state.timer = null;
  const today = await fetchTodayTemplate(db);
  if (!today || today.is_holiday) {
    state.nextRingTs = null; state.nextLabel = null;
    io.emit('bell:next', null);
    return;
  }
  const upcoming = computeTodayRings(today.json_spec);
  if (upcoming.length === 0) {
    state.nextRingTs = null; state.nextLabel = null;
    io.emit('bell:next', null);
    return;
  }
  const next = upcoming[0];
  state.nextRingTs = next.ts.toISO();
  state.nextLabel = next.label;
  const delay = Math.max(0, next.ts.toMillis() - DateTime.now().setZone(config.tz).toMillis());
  logger.info(`Next bell at ${next.ts.toISO()} (${Math.round(delay/1000)}s)`);
  io.emit('bell:next', { ts: state.nextRingTs, label: state.nextLabel });
  state.timer = setTimeout(async () => {
    await triggerBell(db, io, config.relayPulseMs, 'SCHEDULE');
    // Reschedule after trigger
    scheduleNext(db, io);
  }, delay);
}

export async function triggerBell(db, io, durationMs, source = 'MANUAL') {
  const relay = getRelay();
  const start = Date.now();
  try {
    await relay.pulse(durationMs);
    await db.run(
      'INSERT INTO bell_log (ts, action, duration_ms, result, message) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), 'TRIGGER', durationMs, 'OK', source]
    );
    io.emit('bell:triggered', { ts: new Date().toISOString(), durationMs });
    logger.info(`Bell TRIGGER OK (${durationMs}ms)`);
  } catch (e) {
    await db.run(
      'INSERT INTO bell_log (ts, action, duration_ms, result, message) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), 'TRIGGER', durationMs, 'FAIL', String(e)]
    );
    logger.error('Bell TRIGGER FAIL', e);
  } finally {
    const total = Date.now() - start;
    logger.info(`Trigger total ${total}ms`);
  }
}

export const bellScheduler = {
  async init({ db, io }) {
    state.db = db; state.io = io;
    await scheduleNext(db, io);
  },
  async rehydrate() { // call on schedule/template change
    await scheduleNext(state.db, state.io);
  },
  getNext() {
    return state.nextRingTs ? { ts: state.nextRingTs, label: state.nextLabel } : null;
  }
};

/**
 * File: bell.controller.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellScheduler, triggerBell } from './bell.service.js';

export function bellRouter(db, io) {
  const router = express.Router();

  router.get('/next', (req, res) => {
    res.json(bellScheduler.getNext());
  });

  router.post('/test-fire', async (req, res) => {
    const durationMs = Number(req.body?.duration_ms || process.env.RELAY_PULSE_MS || 2500);
    await triggerBell(db, io, durationMs, 'MANUAL');
    res.json({ ok: true });
  });

  router.get('/today', async (req, res) => {
    const row = await db.get(
      `SELECT ds.date, ds.is_holiday, bt.json_spec
       FROM day_schedule ds LEFT JOIN bell_templates bt ON bt.id = ds.bell_template_id
       WHERE ds.date = date('now','localtime')`
    );
    res.json(row || null);
  });

  return router;
}

/**
 * File: bellTemplates.controller.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellScheduler } from './bell.service.js';

export function bellTemplatesRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const rows = await db.all('SELECT * FROM bell_templates ORDER BY id ASC');
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { name, description, json_spec } = req.body;
    if (!name || !json_spec) return res.status(400).json({ message: 'name i json_spec su obavezni' });
    const r = await db.run('INSERT INTO bell_templates (name, description, json_spec) VALUES (?, ?, ?)', [name, description || null, JSON.stringify(json_spec)]);
    res.json({ id: r.lastID });
  });

  router.get('/:id', async (req, res) => {
    const row = await db.get('SELECT * FROM bell_templates WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ message: 'nije pronađeno' });
    res.json(row);
  });

  router.put('/:id', async (req, res) => {
    const { name, description, json_spec } = req.body;
    const r = await db.run('UPDATE bell_templates SET name=?, description=?, json_spec=? WHERE id=?', [name, description || null, JSON.stringify(json_spec), req.params.id]);
    await bellScheduler.rehydrate();
    res.json({ changed: r.changes });
  });

  router.delete('/:id', async (req, res) => {
    const r = await db.run('DELETE FROM bell_templates WHERE id=?', [req.params.id]);
    await bellScheduler.rehydrate();
    res.json({ deleted: r.changes });
  });

  return router;
}

/**
 * File: daySchedule.controller.js
 * Path: /src/modules/schedule
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellScheduler } from '../bell/bell.service.js';

export function dayScheduleRouter(db) {
  const router = express.Router();

  // GET range
  router.get('/', async (req, res) => {
    const { from, to } = req.query;
    const rows = await db.all(
      `SELECT ds.*, bt.name as template_name
       FROM day_schedule ds
       LEFT JOIN bell_templates bt ON bt.id = ds.bell_template_id
       WHERE (? IS NULL OR ds.date >= ?) AND (? IS NULL OR ds.date <= ?)
       ORDER BY ds.date ASC`,
      [from || null, from || null, to || null, to || null]
    );
    res.json(rows);
  });

  // PUT /:date { bell_template_id?, is_holiday?, note? }
  router.put('/:date', async (req, res) => {
    const { date } = req.params;
    const { bell_template_id, is_holiday, note } = req.body;
    await db.run(
      `INSERT INTO day_schedule (date, bell_template_id, is_holiday, note)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET bell_template_id=excluded.bell_template_id, is_holiday=excluded.is_holiday, note=excluded.note`,
      [date, bell_template_id || null, is_holiday ? 1 : 0, note || null]
    );
    await bellScheduler.rehydrate();
    res.json({ ok: true });
  });

  return router;
}

/**
 * File: routes.js
 * Path: /src
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellRouter } from './modules/bell/bell.controller.js';
import { bellTemplatesRouter } from './modules/bell/bellTemplates.controller.js';
import { dayScheduleRouter } from './modules/schedule/daySchedule.controller.js';

export async function registerRoutes(app, db, io) {
  const api = express.Router();
  api.use('/bell', bellRouter(db, io));
  api.use('/bell-templates', bellTemplatesRouter(db));
  api.use('/day-schedule', dayScheduleRouter(db));
  app.use('/api', api);
}
