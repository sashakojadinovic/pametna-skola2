/**
 * File: DisplayBoard.jsx
 * Path: /frontend/src/components/DisplayBoard
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import bellApi from "../../api/bellApi";
import CarouselAnnouncementBoard from "./CarouselAnnouncementBoard";
import {
  buildRings,
  buildSegments,
  formatClock,
  formatMS,
} from "../../utils/bell";
import api from "../../api/axiosInstance";

// =====================
// Top bar (сат + статуси)
// =====================
function TopBar({ nowTick, connected, onSoftRefresh }) {
  const d = new Date(nowTick);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const days = [
    "Недеља",
    "Понедељак",
    "Уторак",
    "Среда",
    "Четвртак",
    "Петак",
    "Субота",
  ];
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 3, py: 1.5, minHeight: 72 }}
    >
      <Stack direction="row" alignItems="baseline" spacing={2}>
        <Typography
          component="div"
          sx={{
            fontWeight: 800,
            lineHeight: 1,
            fontSize: "clamp(28px, 5vw, 64px)",
          }}
        >
          {hh}:{mm}
          <Typography
            component="span"
            sx={{ fontSize: "0.5em", ml: 1, opacity: 0.7 }}
          >
            {ss}
          </Typography>
        </Typography>
        <Typography
          component="div"
          sx={{ fontSize: "clamp(14px, 1.6vw, 22px)", opacity: 0.8 }}
        >
          {days[d.getDay()]} · {String(d.getDate()).padStart(2, "0")}.
          {String(d.getMonth() + 1).padStart(2, "0")}.
          {d.getFullYear()}.
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* Online/offline sada je link ka /admin */}
        <Tooltip title={connected ? "Онлајн (Админ)" : "Нема везе (Админ)"}>
          <IconButton component={Link} to="/admin" size="large">
            {connected ? (
              <CloudDoneIcon fontSize="large" />
            ) : (
              <CloudOffIcon color="error" fontSize="large" />
            )}
          </IconButton>
        </Tooltip>

        {/* Refresh ostaje isto */}
        <Tooltip title="Освежи податке">
          <IconButton onClick={onSoftRefresh} size="large">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

// =====================
// Hook: measure available space of a container
// =====================
function useMeasure() {
  const ref = useRef(null);
  const [rect, setRect] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setRect({ w: cr.width, h: cr.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, rect];
}

// =====================
// Gigantic circular timer sized by measured box
// =====================
function HeroTimer({ startTs, endTs, now, accentColor = "primary", boxSize }) {
  if (!startTs || !endTs || !boxSize) return null;
  const start = startTs.getTime();
  const end = endTs.getTime();
  const total = Math.max(0, end - start);
  const elapsed = Math.min(Math.max(0, now - start), total);
  const remaining = Math.max(0, end - now);
  const value = total > 0 ? Math.round((elapsed / total) * 100) : 0;

  const totalSeconds = Math.floor(remaining / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const timeStr = (hh > 0 ? String(hh).padStart(2, "0") + ":" : "") +
    String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");

  const thickness = Math.max(6, Math.round(boxSize * 0.04));

  return (
    <Box sx={{ position: "relative", width: boxSize, height: boxSize }}>
      <CircularProgress variant="determinate" value={100} thickness={Math.max(4, Math.round(thickness * 0.6))} size={boxSize} sx={{ color: "action.hover", position: "absolute", inset: 0 }} />
      <CircularProgress variant="determinate" value={value} thickness={thickness} size={boxSize} color={accentColor} sx={{ position: "absolute", inset: 0 }} />
      <Box sx={{ position: "absolute", inset: thickness + 8, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Typography sx={{ fontWeight: 800, fontSize: Math.max(56, Math.round(boxSize * 0.22)), lineHeight: 1 }}>{timeStr}</Typography>
      </Box>
    </Box>
  );
}

function MiddleCircle({ nowTick, current }) {
  const [ref, rect] = useMeasure();
  const box = Math.max(120, Math.min(rect.w, rect.h));
  return (
    <Box ref={ref} sx={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {current && box > 0 ? (
        <HeroTimer
          startTs={current.startTs}
          endTs={current.endTs}
          now={nowTick}
          accentColor={current?.type === 'ЧАС' ? 'error' : 'success'}
          boxSize={Math.floor(box * 0.9)}
        />
      ) : (
        <Typography sx={{ fontWeight: 800, fontSize: 'clamp(56px, 12vw, 200px)' }}>—:—</Typography>
      )}
    </Box>
  );
}

export default function DisplayBoard() {
  const [today, setToday] = useState(null);
  const [nextBell, setNextBell] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [announcements, setAnnouncements] = useState([]);
  const [overrideAnnouncement, setOverrideAnnouncement] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchActiveAnnouncements = async () => {
    try {
      const res = await api.get("/announcements/active");
      setAnnouncements(res.data.items || []);
    } catch (e) {
      console.warn("Грешка при учитавању обавештења", e);
    }
  };
  useEffect(() => { fetchActiveAnnouncements(); }, []);

  const softRefresh = async () => {
    const [t, n] = await Promise.all([bellApi.getToday(), bellApi.getNext()]);
    setToday(t);
    setNextBell(n);
    fetchActiveAnnouncements();
  };
  useEffect(() => { softRefresh(); }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const url = import.meta.env.VITE_WS_BASE || "http://localhost:3000";
    const s = io(url, { transports: ["websocket"] });
    socketRef.current = s;
    const refetchActive = () => fetchActiveAnnouncements();
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("bell:next", (payload) => setNextBell(payload));
    s.on("announcement:created", refetchActive);
    s.on("announcement:updated", refetchActive);
    s.on("announcement:deleted", refetchActive);
    s.on("announcement:push", (data) => {
      setOverrideAnnouncement(data);
      setTimeout(() => setOverrideAnnouncement(null), 60000);
    });
    return () => { s.disconnect(); };
  }, []);

  const rings = useMemo(() => buildRings(today?.json_spec), [today]);
  const segments = useMemo(() => buildSegments(rings), [rings]);
  const current = useMemo(() => {
    const now = new Date(nowTick);
    for (const seg of segments) {
      if (now >= seg.startTs && now < seg.endTs) return seg;
    }
    return null;
  }, [segments, nowTick]);

  const nextTs = nextBell?.ts ? new Date(nextBell.ts) : null;
  const countdownMs = useMemo(() => (nextTs ? nextTs.getTime() - nowTick : 0), [nextTs, nowTick]);
  const isHoliday = Boolean(today?.is_holiday);

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "hidden" }}>
      <TopBar nowTick={nowTick} connected={connected} onSoftRefresh={softRefresh} />
      <Box sx={{ flexShrink: 0 }}>
        <CarouselAnnouncementBoard items={announcements} override={overrideAnnouncement} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, px: 3, pb: 3, display: "flex", alignItems: "stretch", justifyContent: "center" }}>
        {isHoliday ? (
          <Typography sx={{ fontSize: "clamp(40px, 8vw, 120px)", fontWeight: 800, textAlign: "center" }}>
            Данас је нерадни дан
          </Typography>
        ) : (
          <Stack spacing={2} alignItems="center" sx={{ flex: 1, minHeight: 0, width: "100%" }}>
            <Chip
              label={
                current?.type === "ЧАС"
                  ? `${current?.periodNo ?? "?"}. ЧАС`
                  : current?.type || "Ван распореда"
              }
              color={current?.type === "ЧАС" ? "error" : "success"}
              sx={{ fontSize: "clamp(16px, 3vw, 36px)", px: 3, py: 3, borderRadius: 3 }}
            />
            <MiddleCircle nowTick={nowTick} current={current} />
            <Typography sx={{ fontSize: "clamp(16px, 2vw, 24px)" }}>
              Следеће звоно у {nextTs ? formatClock(nextTs) : "—"}{" "}
              {nextBell?.label && (
                <Box component="span" sx={{ textTransform: "lowercase", ml: 1 }}>
                  ({nextBell.label})
                </Box>
              )}
            </Typography>
            {!current && (
              <>
                <Typography sx={{ fontSize: "clamp(18px, 3vw, 32px)", opacity: 0.8 }}>
                  {countdownMs > 0 ? "Следи следеће звоно" : "Нема активних интервала"}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "clamp(56px, 12vw, 200px)" }}>
                  {countdownMs > 0 ? formatMS(countdownMs) : "--:--"}
                </Typography>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
