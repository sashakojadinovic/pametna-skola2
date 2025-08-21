/**
 * File: bell.js
 * Path: /frontend/src/utils
 * Author: Saša Kojadinović
 */

// "HH:MM" -> Date za današnji dan (lokalno)
export function timeToday(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map((x) => parseInt(x, 10));
  const now = new Date();
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    isFinite(h) ? h : 0,
    isFinite(m) ? m : 0,
    0,
    0
  );
  return d;
}

// Iz json_spec pravi listu zvona [{ ts: Date, label: string }]
export function buildRings(json_spec) {
  let spec;
  try {
    spec = typeof json_spec === "string" ? JSON.parse(json_spec) : json_spec;
  } catch {
    return [];
  }
  const rings = Array.isArray(spec?.rings) ? spec.rings : [];
  return rings
    .map((r) => ({ ts: timeToday(r.time), label: r.label || "" }))
    .filter((r) => !Number.isNaN(r.ts?.getTime()))
    .sort((a, b) => a.ts - b.ts);
}

// Pokušaj da izvučeš redni broj časa iz labele ("Почетак 3.", "Крај 2."...)
export function parsePeriodNumber(txt) {
  const m = String(txt || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Iz zvona pravi segmente (intervale) dana:
 *  [
 *    {
 *      startTs: Date,
 *      endTs: Date,
 *      type: "ЧАС" | "ОДМОР",
 *      periodNo: number,
 *      startLabel: string,
 *      endLabel: string
 *    }, ...
 *  ]
 *
 * Heuristika:
 * - Ako labela startnog zvona uključuje "крај/kraj/end" -> segment je ОДМОР
 * - U suprotnom -> ЧАС
 * - Ako nema dovoljno informacija, alternira: prvi segment tretira kao ЧАС
 * - Broj časa: pokušava iz labela; fallback je Math.floor(i/2)+1
 */
export function buildSegments(rings) {
  if (!Array.isArray(rings) || rings.length < 2) return [];
  const segments = [];

  for (let i = 0; i < rings.length - 1; i++) {
    const start = rings[i];
    const end = rings[i + 1];
    const startLbl = (start.label || "").toLowerCase();

    const isBreakExplicit =
      startLbl.includes("крај") || startLbl.includes("kraj") || startLbl.includes("end");

    const altIsBreak = i % 2 === 1; // 0: čas, 1: odmor, 2: čas, ...
    const isBreak = isBreakExplicit ? true : altIsBreak;

    const pNum =
      parsePeriodNumber(start.label) ??
      parsePeriodNumber(end.label) ??
      Math.floor(i / 2) + 1;

    segments.push({
      startTs: start.ts,
      endTs: end.ts,
      type: isBreak ? "ОДМОР" : "ЧАС",
      periodNo: pNum,
      startLabel: start.label || "",
      endLabel: end.label || "",
    });
  }

  return segments;
}

// Format pomoćnici
export const pad2 = (n) => String(n).padStart(2, "0");

export function formatClock(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

export function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function formatMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
