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

  // 🔽 učitaj sve .sql fajlove po abecedi (initial.sql + naknadne)
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    await db.exec(sql);
  }

  logger.info('SQLite initialized and migrated.');
  return db;
}
