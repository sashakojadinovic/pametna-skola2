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