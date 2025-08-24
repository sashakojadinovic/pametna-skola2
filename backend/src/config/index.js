/**
* File: index.js
* Path: /src/config
* Author: Saša Kojadinović
*/
export const config = {
tz: process.env.TZ || 'Europe/Belgrade',
relayPin: Number(process.env.RELAY_PIN || 18),
relayPulseMs: Number(process.env.RELAY_PULSE_MS || 2500),
mockGpio: (process.env.MOCK_GPIO || 'false').toLowerCase() === 'true',
dbFile: process.env.DB_FILE || './data/pametna_skola.db',
enableAudioBackend: (process.env.ENABLE_AUDIO_BACKEND || 'false').toLowerCase() === 'true',

};