/**
 * File: daySchedule.controller.js
 * Path: /src/modules/schedule
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellScheduler } from '../bell/bell.service.js';

export function dayScheduleRouter(db) {
  const router = express.Router();

  // Lista (sa opcionalnim opsegom datuma)
  router.get('/', async (req, res) => {
    try {
      const { from, to } = req.query;
      const rows = await db.all(
        `SELECT
           ds.*,
           bt.name  AS template_name,
           bt.color AS template_color
         FROM day_schedule ds
         LEFT JOIN bell_templates bt ON bt.id = ds.bell_template_id
         WHERE (? IS NULL OR ds.date >= ?)
           AND (? IS NULL OR ds.date <= ?)
         ORDER BY ds.date ASC`,
        [from || null, from || null, to || null, to || null]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ message: 'Greška servera', error: String(e) });
    }
  });

  // Upis/izmene dnevnog rasporeda (po datumu) — sada podržava i playlist_id
  router.put('/:date', async (req, res) => {
    try {
      const { date } = req.params;

      const {
        bell_template_id,
        playlist_id,      // ⬅️ NOVO: vezivanje plejliste za dan
        is_holiday,
        note,
      } = req.body || {};

      // Normalizacija vrednosti
      const tplId = bell_template_id != null ? Number(bell_template_id) : null;
      const plId  = playlist_id != null ? Number(playlist_id) : null;
      const hol   = is_holiday ? 1 : 0;
      const noteV = note || null;

      await db.run(
        `INSERT INTO day_schedule (date, bell_template_id, playlist_id, is_holiday, note)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           bell_template_id = excluded.bell_template_id,
           playlist_id      = excluded.playlist_id,
           is_holiday       = excluded.is_holiday,
           note             = excluded.note`,
        [date, tplId, plId, hol, noteV]
      );

      await bellScheduler.rehydrate();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: 'Greška servera', error: String(e) });
    }
  });

  return router;
}
