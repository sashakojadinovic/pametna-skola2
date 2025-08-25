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

function playBellSound(filePath) {
  const fullPath = path.resolve(filePath);
  const child = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", fullPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function spawnMusic(filePath) {
  const fullPath = path.resolve(filePath);
  return spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", fullPath], {
    stdio: "ignore",
  });
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const state = {
  nextRingTs: null,
  nextLabel: null,
  timer: null,
  db: null,
  io: null,
  musicProc: null,
  musicActive: false,
  musicStartTimer: null,
  musicPreStopTimer: null,
  playlistIdToday: null,
  playlistModeToday: 'SHUFFLE',
  shuffledTrackList: [],
  shuffledIndex: 0,
  orderedIndex: 0,
};

async function resolveTodayPlaylistId(db) {
  const today = nowTZ(config.tz).toFormat('yyyy-LL-dd');
  const day = await db.get(`SELECT playlist_id FROM day_schedule WHERE date = ?`, [today]);
  const playlistId = day?.playlist_id;

  if (!playlistId) {
    const def = await db.get(`SELECT id, mode FROM playlists WHERE is_active = 1 AND is_default = 1 LIMIT 1`);
    if (!def) return null;
    state.playlistModeToday = def.mode || 'SHUFFLE';
    return def.id;
  }

  const playlist = await db.get(`SELECT id, mode FROM playlists WHERE id = ?`, [playlistId]);
  if (!playlist) return null;
  state.playlistModeToday = playlist.mode || 'SHUFFLE';
  return playlist.id;
}

async function startMusicIfPossible(force = false) {
  try {
    if (!config.enableAudioBackend || !state.db) return;
    if (state.musicActive && !force) return;

    if (!state.playlistIdToday) {
      state.playlistIdToday = await resolveTodayPlaylistId(state.db);
    }
    if (!state.playlistIdToday) return;

    const tracks = await state.db.all(`SELECT id, file_path FROM tracks WHERE playlist_id = ? ORDER BY order_index ASC`, [state.playlistIdToday]);
    if (!Array.isArray(tracks) || tracks.length === 0) return;

    let pick = null;
    if (state.playlistModeToday === 'ORDERED') {
      if (!state.orderedIndex || state.orderedIndex >= tracks.length) state.orderedIndex = 0;
      pick = tracks[state.orderedIndex];
      state.orderedIndex++;
    } else {
      if (!state.shuffledTrackList?.length) {
        state.shuffledTrackList = shuffleArray(tracks);
        state.shuffledIndex = 0;
        console.log('[music] SHUFFLE REDOSLED:', state.shuffledTrackList.map(t => t.file_path));
      }
      pick = state.shuffledTrackList[state.shuffledIndex];
      state.shuffledIndex = (state.shuffledIndex + 1) % state.shuffledTrackList.length;
    }

    const p = spawnMusic(pick.file_path);
    state.musicProc = p;
    state.musicActive = true;
    logger.info(`[music] START -> ${pick.file_path}`);

    p.on('exit', async () => {
      state.musicActive = false;
      if (state.musicActive) return; // safety check
      try {
        const msToNext = msToNextBell();
        if (msToNext != null && msToNext < 30000 + 5000) {
          stopMusic("near_bell");
          return;
        }
        startMusicIfPossible(true);
      } catch (e) {
        logger.error("[music] Greška u loopu:", e);
        stopMusic("error_loop");
      }
    });
  } catch (e) {
    logger.error("[music] Greška pri startu:", e);
    stopMusic("error_start");
  }
}

function stopMusic(reason = "stop") {
  if (state.musicProc) {
    try { state.musicProc.kill('SIGTERM'); } catch {}
    state.musicProc = null;
  }
  if (state.musicStartTimer) { clearTimeout(state.musicStartTimer); state.musicStartTimer = null; }
  if (state.musicPreStopTimer) { clearTimeout(state.musicPreStopTimer); state.musicPreStopTimer = null; }
  if (state.musicActive) logger.info(`[music] STOP (${reason})`);
  state.musicActive = false;
}

function msToNextBell() {
  if (!state.nextRingTs) return null;
  const now = DateTime.now().setZone(config.tz).toMillis();
  const next = DateTime.fromISO(state.nextRingTs).setZone(config.tz).toMillis();
  return Math.max(0, next - now);
}

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
  return list.filter(x => x.ts > nowTZ(config.tz)).sort((a, b) => a.ts - b.ts);
}

async function scheduleNext(db, io) {
  clearTimeout(state.timer);
  if (state.musicPreStopTimer) { clearTimeout(state.musicPreStopTimer); state.musicPreStopTimer = null; }
  state.timer = null;

  const today = await fetchTodayTemplate(db);
  if (!today || today.is_holiday) {
    state.nextRingTs = null; state.nextLabel = null;
    stopMusic("holiday_or_no_schedule");
    io.emit('bell:next', null);
    return;
  }

  state.playlistIdToday = await resolveTodayPlaylistId(db);
  state.shuffledTrackList = []; state.shuffledIndex = 0;

  const upcoming = computeTodayRings(today.json_spec);
  if (upcoming.length === 0) {
    state.nextRingTs = null; state.nextLabel = null;
    stopMusic("no_more_bells");
    io.emit('bell:next', null);
    return;
  }

  const next = upcoming[0];
  state.nextRingTs = next.ts.toISO();
  state.nextLabel = next.label;
  const delay = Math.max(0, next.ts.toMillis() - DateTime.now().setZone(config.tz).toMillis());

  logger.info(`Next bell at ${next.ts.toISO()} (${Math.round(delay / 1000)}s)`);
  io.emit('bell:next', { ts: state.nextRingTs, label: state.nextLabel });

  const preStop = delay - 30000;
  if (preStop > 0) {
    state.musicPreStopTimer = setTimeout(() => stopMusic("pre_bell_30s"), preStop);
  } else {
    stopMusic("pre_bell_immediate");
  }

  state.timer = setTimeout(async () => {
    stopMusic("bell_incoming");
    await triggerBell(db, io, config.relayPulseMs, 'SCHEDULE');

    state.musicStartTimer = setTimeout(() => {
      startMusicIfPossible();
    }, config.musicPostBellDelayMs);

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

export function playNotificationSound() {
  if (!config.enableAudioBackend) return;
  const audioFile = path.join(__dirname, "../../audio/alert-gentle.mp3");
  playBellSound(audioFile);
}
