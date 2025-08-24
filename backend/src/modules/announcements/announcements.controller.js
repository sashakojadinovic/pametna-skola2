/**
 * File: announcements.controller.js
 * Path: /src/modules/announcements
 * Author: Saša Kojadinović
 */

import express from "express";
import { DateTime } from "luxon";
import { nowTZ } from "../../utils/time.js"; // koristi postojeći TZ (Europe/Belgrade)
import { playNotificationSound } from "../bell/bell.service.js";

/** Priority helper */
const PRIORITY_ORDER_DESC_SQL = `
  CASE priority
    WHEN 'URGENT' THEN 3
    WHEN 'HIGH'   THEN 2
    ELSE 1
  END
`;

/** Bezbedan parse ISO: vraća DateTime ili null */
function parseISO(val, tz) {
  if (!val) return null;
  const dt = DateTime.fromISO(String(val), { setZone: true });
  if (!dt.isValid) return null;
  return dt.setZone(tz || "Europe/Belgrade");
}

/** Sanitizacija body polja (minimalna; može se zameniti bibliotekama) */
function sanitizeBody(body) {
  if (typeof body !== "string") return body;
  // ukloni <script>…</script> i on* atribute
  return body
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "");
}

export function announcementsRouter(db, io) {
  const router = express.Router();

  /**
   * GET /api/announcements/active
   * Query: limit (default 10, max 50), now (ISO, optional za test)
   */
  router.get("/active", async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
      const tzNow =
        parseISO(req.query.now, process.env.TZ) ||
        nowTZ(process.env.TZ || "Europe/Belgrade");
      const nowIso = tzNow.toISO();

      // ACTIVE: is_active=1 i now ∈ [start_ts, end_ts)
      // Sort: priority desc (po mapi), pa start_ts asc
      const rows = await db.all(
        `
        SELECT id, title, body, priority, start_ts, end_ts
        FROM announcements
        WHERE is_active=1
          AND start_ts IS NOT NULL
          AND end_ts   IS NOT NULL
          AND datetime(?)
              >= datetime(start_ts)
          AND datetime(?)
              <  datetime(end_ts)
        ORDER BY ${PRIORITY_ORDER_DESC_SQL} DESC, datetime(start_ts) ASC
        LIMIT ?
        `,
        [nowIso, nowIso, limit]
      );

      res.json({
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          priority: r.priority || "NORMAL",
          start_ts: r.start_ts,
          end_ts: r.end_ts,
        })),
        now: tzNow.toISO(),
      });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  /**
   * GET /api/announcements
   * Admin lista sa filterima i paginacijom
   * Query:
   *  - status=active|scheduled|expired|all (default all)
   *  - q (title/body LIKE)
   *  - from, to (ISO) — preseci sa [start_ts, end_ts)
   *  - page (default 1), per_page (default 20, max 100)
   *  - sort (default -start_ts; dozvoljeno: start_ts, -start_ts, priority, -priority)
   */
  router.get("/", async (req, res) => {
    try {
      const status = String(req.query.status || "all").toLowerCase();
      const q = (req.query.q || "").trim();
      const tz = process.env.TZ || "Europe/Belgrade";
      const from = parseISO(req.query.from, tz);
      const to = parseISO(req.query.to, tz);

      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.max(1, Math.min(100, Number(req.query.per_page) || 20));
      const offset = (page - 1) * perPage;

      const sort = String(req.query.sort || "-start_ts");
      let orderBy = "datetime(start_ts) DESC";
      if (sort === "start_ts") orderBy = "datetime(start_ts) ASC";
      else if (sort === "-start_ts") orderBy = "datetime(start_ts) DESC";
      else if (sort === "priority") orderBy = `${PRIORITY_ORDER_DESC_SQL} ASC`;
      else if (sort === "-priority") orderBy = `${PRIORITY_ORDER_DESC_SQL} DESC`;

      // bazni WHERE i params
      const where = [];
      const params = [];

      // status filter
      const now = nowTZ(tz).toISO();
      if (status === "active") {
        where.push(
          "is_active=1 AND start_ts IS NOT NULL AND end_ts IS NOT NULL AND datetime(?)>=datetime(start_ts) AND datetime(?)<datetime(end_ts)"
        );
        params.push(now, now);
      } else if (status === "scheduled") {
        where.push(
          "is_active=1 AND start_ts IS NOT NULL AND datetime(start_ts)>datetime(?)"
        );
        params.push(now);
      } else if (status === "expired") {
        where.push(
          "is_active=0 OR (end_ts IS NOT NULL AND datetime(end_ts)<=datetime(?))"
        );
        params.push(now);
      }

      // q filter
      if (q) {
        where.push("(title LIKE ? OR body LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
      }

      // from/to preseci sa intervalom (start_ts/end_ts)
      if (from) {
        where.push(
          // intervali seku ako end_ts > from
          "(end_ts IS NULL OR datetime(end_ts) > datetime(?))"
        );
        params.push(from.toISO());
      }
      if (to) {
        where.push(
          // intervali seku ako start_ts < to
          "(start_ts IS NULL OR datetime(start_ts) < datetime(?))"
        );
        params.push(to.toISO());
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const totalRow = await db.get(
        `SELECT COUNT(*) as cnt FROM announcements ${whereSql}`,
        params
      );
      const total = totalRow?.cnt || 0;

      const rows = await db.all(
        `
        SELECT id, title, body, priority, start_ts, end_ts, is_active
        FROM announcements
        ${whereSql}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
        `,
        [...params, perPage, offset]
      );

      res.json({
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          priority: r.priority || "NORMAL",
          start_ts: r.start_ts,
          end_ts: r.end_ts,
          is_active: !!r.is_active,
        })),
        page,
        per_page: perPage,
        total,
      });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  /**
   * POST /api/announcements
   */
  router.post("/", async (req, res) => {
    try {
      const { title, body, priority = "NORMAL", start_ts, end_ts, is_active = true } =
        req.body || {};

      if (!title || !start_ts || !end_ts) {
        return res.status(400).json({ message: "title, start_ts i end_ts su obavezni" });
      }
      if (String(title).length > 200) {
        return res.status(400).json({ message: "title je predugačak" });
      }
      if (body && String(body).length > 5000) {
        return res.status(400).json({ message: "body je predugačak" });
      }
      if (!["NORMAL", "HIGH", "URGENT"].includes(priority)) {
        return res.status(400).json({ message: "priority nije validan" });
      }

      const tz = process.env.TZ || "Europe/Belgrade";
      const s = parseISO(start_ts, tz);
      const e = parseISO(end_ts, tz);
      if (!s?.isValid || !e?.isValid) {
        return res.status(400).json({ message: "start_ts/end_ts nisu validni ISO datumi" });
      }
      if (e <= s) {
        return res.status(400).json({ message: "end_ts mora biti posle start_ts" });
      }

      const cleanBody = sanitizeBody(body || "");

      const r = await db.run(
        `
        INSERT INTO announcements (title, body, priority, start_ts, end_ts, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [title, cleanBody, priority, s.toISO(), e.toISO(), is_active ? 1 : 0]
      );

      const inserted = {
        id: r.lastID,
        title,
        body: cleanBody,
        priority,
        start_ts: s.toISO(),
        end_ts: e.toISO(),
        is_active: !!is_active,
      };

      io.emit("announcement:created", inserted);
      res.json({ id: r.lastID });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  /**
   * PUT /api/announcements/:id
   * Partial update dozvoljen (sva polja opcionalna)
   */
  router.put("/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: "Neispravan id" });

      const allowed = ["title", "body", "priority", "start_ts", "end_ts", "is_active"];
      const payload = {};
      for (const k of allowed) {
        if (k in req.body) payload[k] = req.body[k];
      }
      if (!Object.keys(payload).length) {
        return res.json({ changed: 0 });
      }

      // Validacije
      if (payload.title && String(payload.title).length > 200) {
        return res.status(400).json({ message: "title je predugačak" });
      }
      if (payload.body && String(payload.body).length > 5000) {
        return res.status(400).json({ message: "body je predugačak" });
      }
      if (payload.priority && !["NORMAL", "HIGH", "URGENT"].includes(payload.priority)) {
        return res.status(400).json({ message: "priority nije validan" });
      }

      const tz = process.env.TZ || "Europe/Belgrade";
      if (payload.start_ts) {
        const s = parseISO(payload.start_ts, tz);
        if (!s?.isValid) return res.status(400).json({ message: "start_ts nije validan ISO" });
        payload.start_ts = s.toISO();
      }
      if (payload.end_ts) {
        const e = parseISO(payload.end_ts, tz);
        if (!e?.isValid) return res.status(400).json({ message: "end_ts nije validan ISO" });
        payload.end_ts = e.toISO();
      }
      if (payload.start_ts && payload.end_ts) {
        if (DateTime.fromISO(payload.end_ts) <= DateTime.fromISO(payload.start_ts)) {
          return res.status(400).json({ message: "end_ts mora biti posle start_ts" });
        }
      }
      if (payload.body) payload.body = sanitizeBody(payload.body);

      // Dinamički UPDATE
      const fields = [];
      const values = [];
      for (const [k, v] of Object.entries(payload)) {
        fields.push(`${k}=?`);
        if (k === "is_active") values.push(v ? 1 : 0);
        else values.push(v);
      }
      values.push(id);

      const r = await db.run(
        `UPDATE announcements SET ${fields.join(", ")} WHERE id=?`,
        values
      );

      if (r.changes) {
        io.emit("announcement:updated", { id, changedFields: Object.keys(payload) });
      }

      res.json({ changed: r.changes || 0 });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  /**
   * PATCH /api/announcements/:id/toggle
   */
  router.patch("/:id/toggle", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: "Neispravan id" });

      const isActive = !!req.body?.is_active;
      const r = await db.run(`UPDATE announcements SET is_active=? WHERE id=?`, [
        isActive ? 1 : 0,
        id,
      ]);

      if (r.changes) {
        io.emit("announcement:updated", { id, changedFields: ["is_active"] });
      }
      res.json({ changed: r.changes || 0 });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  /**
   * DELETE /api/announcements/:id
   */
  router.delete("/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: "Neispravan id" });
      const r = await db.run(`DELETE FROM announcements WHERE id=?`, [id]);
      if (r.changes) io.emit("announcement:deleted", { id });
      res.json({ deleted: r.changes || 0 });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  /**
   * POST /api/announcements/:id/push
   * Emituje push event; ne menja zapis u bazi
   */
  router.post("/:id/push", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: "Neispravan id" });
      const row = await db.get(
        `SELECT id, title, body, priority, start_ts, end_ts, is_active FROM announcements WHERE id=?`,
        [id]
      );
      if (!row) return res.status(404).json({ message: "Nije pronađeno" });
      io.emit("announcement:push", row);
      playNotificationSound(); 
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Greška servera", error: String(e) });
    }
  });

  return router;
}
