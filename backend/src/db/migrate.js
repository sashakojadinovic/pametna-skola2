/**
* File: migrate.js
* Path: /src/db
* Author: Saša Kojadinović
*/
import { initDb } from './index.js';
await initDb();
console.log('Migration completed');