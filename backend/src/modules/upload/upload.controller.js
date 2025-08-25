/**
 * File: upload.controller.js
 * Path: /src/modules/upload
 * Author: Saša Kojadinović
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 📁 Direktorijum gde čuvamo pesme
const UPLOAD_DIR = path.resolve('uploads/tracks');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 🎵 Dozvoljeni formati fajlova
const ALLOWED_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/x-aac',
  'audio/x-flac',
];

// 🗃️ Podešavanje multer storidža
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, '_');
    const timestamp = Date.now();
    cb(null, `${base}_${timestamp}${ext}`);
  },
});

// 🔐 Filter koji dozvoljava samo podržane audio tipove
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Недозвољени тип фајла'));
};

const upload = multer({ storage, fileFilter });

// 📤 Exportovana ruta za upload
export function uploadRouter() {
  const router = express.Router();

  /**
   * POST /api/upload/track
   * Content-Type: multipart/form-data
   * Body: file (audio file)
   */
  router.post('/track', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Фајл није послат' });
    }

    const relativePath = `uploads/tracks/${req.file.filename}`;
    res.json({ file_path: relativePath });
  });

  return router;
}
