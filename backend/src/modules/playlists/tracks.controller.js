/**
 * File: tracks.controller.js
 * Path: /src/modules/playlists
 * Author: Saša Kojadinović
 */

import express from 'express';

export function tracksRouter(db) {
  const router = express.Router({ mergeParams: true });

  // Vrati sve pesme u plejlisti
  router.get('/', async (req, res) => {
    const { id: playlistId } = req.params;
    try {
      const rows = await db.all(
        `SELECT * FROM tracks WHERE playlist_id = ? ORDER BY order_index ASC`,
        [playlistId]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Dodaj pesmu
  router.post('/', async (req, res) => {
    const { id: playlistId } = req.params;
    const { file_path, title, artist, duration_s, order_index } = req.body;
    try {
      const result = await db.run(
        `INSERT INTO tracks (playlist_id, file_path, title, artist, duration_s, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [playlistId, file_path, title, artist, duration_s, order_index]
      );
      res.status(201).json({ id: result.lastID });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Izmeni pesmu
  router.put('/:trackId', async (req, res) => {
    const { trackId } = req.params;
    const { file_path, title, artist, duration_s, order_index } = req.body;
    try {
      await db.run(
        `UPDATE tracks SET
           file_path = ?, title = ?, artist = ?, duration_s = ?, order_index = ?
         WHERE id = ?`,
        [file_path, title, artist, duration_s, order_index, trackId]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Obrisi pesmu
  router.delete('/:trackId', async (req, res) => {
    const { trackId } = req.params;
    try {
      await db.run(`DELETE FROM tracks WHERE id = ?`, [trackId]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}
