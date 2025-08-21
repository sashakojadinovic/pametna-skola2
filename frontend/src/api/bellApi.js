/**
 * File: bellApi.js
 * Path: /frontend/src/api
 * Author: Saša Kojadinović
 */
import api from "./axiosInstance";

/**
 * Gruba validacija #RRGGBB / #RRGGBBAA – vraća čist hex ili null.
 */
function normalizeHexColor(c) {
  const s = String(c || "").trim();
  if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s)) return s;
  return null;
}

/**
 * Normalizuje i grubo validira payload za šablon zvona.
 * Prihvata { name, description?, color?, json_spec: { rings: [{ time:'HH:MM', label? }] } }
 * i vraća istu strukturu sa očišćenim vrednostima.
 */
function normalizeTemplatePayload(p = {}) {
  const ringsIn = Array.isArray(p?.json_spec?.rings) ? p.json_spec.rings : [];
  const rings = ringsIn
    .map((r) => ({
      time: String(r?.time ?? "").slice(0, 5), // "HH:MM"
      label: r?.label ? String(r.label) : "",
    }))
    .filter((r) => /^\d{2}:\d{2}$/.test(r.time));

  const body = {
    name: (p?.name ?? "").trim(),
    description: p?.description ? String(p.description) : null,
    json_spec: { rings },
  };

  const color = normalizeHexColor(p?.color);
  if (color) body.color = color; // pošalji samo ako je validno; u suprotnom backend default ostaje

  return body;
}

const bellApi = {
  // -----------------------------
  // Bell status
  // -----------------------------
  async getNext() {
    try {
      const { data } = await api.get("/bell/next");
      return data; // { ts, label } | null
    } catch {
      return null;
    }
  },

  async getToday() {
    try {
      const { data } = await api.get("/bell/today");
      return data; // { date, is_holiday, json_spec } | null
    } catch {
      return null;
    }
  },

  async testFire(durationMs) {
    // Guard protiv NaN/negativnih i prekratkih pulseva
    const safe = Math.max(100, Number(durationMs) || 0);
    const { data } = await api.post("/bell/test-fire", { duration_ms: safe });
    return data; // { ok: true }
  },

  // -----------------------------
  // Templates CRUD (sa color)
  // -----------------------------
  async getTemplates() {
    const { data } = await api.get("/bell-templates");
    return data; // očekuje: [{ id, name, description, color, json_spec?, ... }]
  },

  async getTemplate(id) {
    const { data } = await api.get(`/bell-templates/${id}`);
    return data; // { id, name, description, color, json_spec, ... }
  },

  async createTemplate(payload) {
    const body = normalizeTemplatePayload(payload);
    const { data } = await api.post("/bell-templates", body);
    return data; // { id }
  },

  async updateTemplate(id, payload) {
    const body = normalizeTemplatePayload(payload);
    const { data } = await api.put(`/bell-templates/${id}`, body);
    return data; // { changed }
  },

  async deleteTemplate(id) {
    const { data } = await api.delete(`/bell-templates/${id}`);
    return data; // { deleted }
  },

  // -----------------------------
  // Day schedule (prima {start,end} ili {from,to})
  // -----------------------------
  async getDaySchedule(range = {}) {
    // Podržavamo obe forme, mapiramo na start/end
    const start = range.start || range.from || null;
    const end = range.end || range.to || null;

    const params = {};
    if (start) params.start = start; // 'YYYY-MM-DD'
    if (end) params.end = end;       // 'YYYY-MM-DD'

    const { data } = await api.get("/day-schedule", { params });
    return data; // očekuje: [{ date, is_holiday, bell_template_id, template_name, template_color, ... }]
  },

  async putDay(date, payload) {
    // payload: { bell_template_id?, is_holiday?, note? }
    const { data } = await api.put(`/day-schedule/${date}`, payload);
    return data; // { ok: true }
  },
};

export default bellApi;
