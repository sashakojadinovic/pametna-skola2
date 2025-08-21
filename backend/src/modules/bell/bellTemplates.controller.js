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