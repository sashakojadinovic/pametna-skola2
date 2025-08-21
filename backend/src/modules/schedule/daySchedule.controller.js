/**
 * File: daySchedule.controller.js
 * Path: /src/modules/schedule
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellScheduler } from '../bell/bell.service.js';

export function dayScheduleRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { from, to } = req.query;
    const rows = await db.all(
      `SELECT ds.*, bt.name as template_name, bt.color as template_color
       FROM day_schedule ds
       LEFT JOIN bell_templates bt ON bt.id = ds.bell_template_id
       WHERE (? IS NULL OR ds.date >= ?) AND (? IS NULL OR ds.date <= ?)
       ORDER BY ds.date ASC`,
      [from || null, from || null, to || null, to || null]
    );
    res.json(rows);
  });

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
