/**
* File: logger.js
* Path: /src/utils
* Author: Saša Kojadinović
*/
export const logger = {
info: (...a) => console.log('[INFO]', ...a),
warn: (...a) => console.warn('[WARN]', ...a),
error: (...a) => console.error('[ERROR]', ...a)
};