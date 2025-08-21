/**
* File: time.js
* Path: /src/utils
* Author: Saša Kojadinović
*/
import { DateTime } from 'luxon';


export function nowTZ(tz) {
return DateTime.now().setZone(tz || process.env.TZ || 'Europe/Belgrade');
}


export function parseTimeToday(tz, hhmm) {
const [h, m] = hhmm.split(':').map(Number);
return nowTZ(tz).set({ hour: h, minute: m, second: 0, millisecond: 0 });
}