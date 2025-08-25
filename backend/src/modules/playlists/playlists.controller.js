/**
 * File: playlists.controller.js
 * Path: /src/modules/playlists
 * Author: Saša Kojadinović
 */

import express from 'express';

export function playlistsRouter(db) {
  const router = express.Router();

  // Vrati sve plejliste
  router.get('/', async (req, res) => {
    try {
      const rows = await db.all(`SELECT * FROM playlists ORDER BY name ASC`);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Kreiraj novu plejlistu
  router.post('/', async (req, res) => {
    try {
      const { name, mode = 'SHUFFLE', crossfade_s = 0, is_active = 1, is_default = 0 } = req.body;
      const result = await db.run(
        `INSERT INTO playlists (name, mode, crossfade_s, is_active, is_default)
         VALUES (?, ?, ?, ?, ?)`,
        [name, mode, crossfade_s, is_active, is_default]
      );
      res.status(201).json({ id: result.lastID });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Izmeni plejlistu
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, mode, crossfade_s, is_active, is_default } = req.body;
      await db.run(
        `UPDATE playlists SET
           name = ?,
           mode = ?,
           crossfade_s = ?,
           is_active = ?,
           is_default = ?
         WHERE id = ?`,
        [name, mode, crossfade_s, is_active, is_default, id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Obrisi plejlistu
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.run(`DELETE FROM playlists WHERE id = ?`, [id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}
