/**
 * File: routes.js
 * Path: /src
 * Author: Saša Kojadinović
 */
import express from 'express';
import { bellRouter } from './modules/bell/bell.controller.js';
import { bellTemplatesRouter } from './modules/bell/bellTemplates.controller.js';
import { dayScheduleRouter } from './modules/schedule/daySchedule.controller.js';
import { announcementsRouter } from './modules/announcements/announcements.controller.js';
import { playlistsRouter } from './modules/playlists/playlists.controller.js';
import { tracksRouter } from './modules/playlists/tracks.controller.js';

export async function registerRoutes(app, db, io) {
  const api = express.Router();
  api.use('/bell', bellRouter(db, io));
  api.use('/bell-templates', bellTemplatesRouter(db));
  api.use('/day-schedule', dayScheduleRouter(db));
  api.use('/announcements', announcementsRouter(db, io));
  api.use('/playlists', playlistsRouter(db));
  api.use('/playlists/:id/tracks', tracksRouter(db));
  app.use('/api', api);
}
