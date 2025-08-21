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

  // ⬇️ Ensure bell_templates.color exists (safe for existing DBs)
  const cols = await db.all(`PRAGMA table_info(bell_templates)`);
  const hasColor = cols.some(c => c.name === 'color');
  if (!hasColor) {
    await db.exec(`ALTER TABLE bell_templates ADD COLUMN color TEXT DEFAULT '#1976d2';`);
    logger.info('Added bell_templates.color column');
  }

  logger.info('SQLite initialized and migrated.');
  return db;
}
