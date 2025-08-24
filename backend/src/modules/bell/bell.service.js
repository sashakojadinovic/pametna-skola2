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
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Lokalna funkcija za puštanje zvuka
function playBellSound(filePath) {
    const fullPath = path.resolve(filePath);
    const child = spawn("ffplay", [
        "-nodisp",
        "-autoexit",
        "-loglevel", "quiet",
        fullPath
    ], {
        detached: true,
        stdio: "ignore"
    });
    child.unref();
}

// 🔄 Interno stanje rasporeda
const state = {
    nextRingTs: null,
    nextLabel: null,
    timer: null,
    db: null,
    io: null
};

// 🔽 Učitavanje rasporeda
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

// 🔁 Preračunavanje zvona iz šablona
function computeTodayRings(json_spec) {
    if (!json_spec) return [];
    let spec;
    try { spec = JSON.parse(json_spec); } catch { return []; }
    const rings = Array.isArray(spec.rings) ? spec.rings : [];
    const list = rings.map((r) => ({
        ts: parseTimeToday(config.tz, r.time),
        label: r.label || ''
    }));
    return list.filter(x => x.ts > nowTZ(config.tz)).sort((a, b) => a.ts - b.ts);
}

// 📅 Planiranje sledećeg zvona
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
    logger.info(`Next bell at ${next.ts.toISO()} (${Math.round(delay / 1000)}s)`);
    io.emit('bell:next', { ts: state.nextRingTs, label: state.nextLabel });
    state.timer = setTimeout(async () => {
        await triggerBell(db, io, config.relayPulseMs, 'SCHEDULE');
        scheduleNext(db, io);
    }, delay);
}

// 🔔 Okidanje zvona (ručno ili po rasporedu)
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

        // ▶️ Pusti zvuk lokalno na serveru
        const audioFile = path.join(__dirname, "../../audio/bell-oldschool.mp3");
        if (config.enableAudioBackend) {
            playBellSound(audioFile);
        }

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

// 📦 Exportovani scheduler objekat
export const bellScheduler = {
    async init({ db, io }) {
        state.db = db; state.io = io;
        await scheduleNext(db, io);
    },
    async rehydrate() {
        await scheduleNext(state.db, state.io);
    },
    getNext() {
        return state.nextRingTs ? { ts: state.nextRingTs, label: state.nextLabel } : null;
    }
};
// 📣 Funkcija za puštanje zvuka obaveštenja
export function playNotificationSound() {
  if (!config.enableAudioBackend) return;
  const audioFile = path.join(__dirname, "../../audio/alert-gentle.mp3");
  playBellSound(audioFile);
}