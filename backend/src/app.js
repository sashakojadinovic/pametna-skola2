/**
* File: app.js
* Path: /src
* Author: Saša Kojadinović
*/
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { initDb } from './db/index.js';
import { initSocket } from './realtime/ws.js';
import { registerRoutes } from './routes.js';
import { bellScheduler } from './modules/bell/bell.service.js';
import { logger } from './utils/logger.js';


const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*'}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));


// Health
app.get('/api/health', (req, res) => {
res.json({ status: 'ok', now: new Date().toISOString() });
});


const server = http.createServer(app);
const io = initSocket(server);


// Bootstrap
const PORT = process.env.PORT || 3000;
const TZ = process.env.TZ || 'Europe/Belgrade';
process.env.TZ = TZ; // ensure Node uses school TZ


const db = await initDb();
await registerRoutes(app, db, io);
await bellScheduler.init({ db, io });


server.listen(PORT, () => {
logger.info(`Backend listening on :${PORT} (TZ=${TZ})`);
});