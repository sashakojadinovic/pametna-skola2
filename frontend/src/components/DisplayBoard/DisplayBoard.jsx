/**
 * File: DisplayBoard.jsx
 * Path: /frontend/src/components/DisplayBoard
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Box, Card, CardContent, Typography, Stack, Chip, Divider } from "@mui/material";
import bellApi from "../../api/bellApi";
import ProgressTimer from "./ProgressTimer";
import MiniSchedule from "./MiniSchedule";
import {
  buildRings,
  buildSegments,
  formatClock,
  formatHMS,
  formatMS,
} from "../../utils/bell";

export default function DisplayBoard() {
  const [today, setToday] = useState(null);     // { date, is_holiday, json_spec } | null
  const [nextBell, setNextBell] = useState(null); // { ts, label } | null
  const [nowTick, setNowTick] = useState(Date.now());
  const socketRef = useRef(null);

  // init: učitaj današnji raspored i sledeće zvono
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [t, n] = await Promise.all([bellApi.getToday(), bellApi.getNext()]);
      if (!mounted) return;
      setToday(t);
      setNextBell(n);
    })();
    return () => { mounted = false; };
  }, []);

  // socket.io – sluša promene
  useEffect(() => {
    const url = import.meta.env.VITE_WS_BASE || "http://localhost:3000";
    const s = io(url, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("bell:next", (payload) => setNextBell(payload));
    s.on("bell:triggered", () => {
      // nakon okidanja, backend emitovaće novi 'bell:next'
    });

    return () => { s.disconnect(); };
  }, []);

  // 1s ticker
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Izračuni
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
  const countdownMs = useMemo(
    () => (nextTs ? nextTs.getTime() - nowTick : 0),
    [nextTs, nowTick]
  );

  const currentRemainingMs = useMemo(() => {
    if (!current) return 0;
    return Math.max(0, current.endTs.getTime() - nowTick);
  }, [current, nowTick]);

  const isHoliday = Boolean(today?.is_holiday);

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ maxWidth: 960, mx: "auto", textAlign: "center", p: 2 }}>
        <CardContent>
          <Typography variant="h3" gutterBottom>Огласна табла</Typography>

          {isHoliday ? (
            <Typography variant="h5" color="text.secondary" sx={{ my: 2 }}>
              Данас је нерадни дан.
            </Typography>
          ) : (
            <>
              {/* Trenutni status */}
              <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  label={current?.type || "Ван распореда"}
                  color={current?.type === "ЧАС" ? "primary" : "default"}
                />
                {current?.type === "ЧАС" && (
                  <Chip label={`Час ${current?.periodNo ?? "?"}`} color="secondary" />
                )}
              </Stack>

              {/* Preostalo u tekućem intervalu + progress bar */}
              <ProgressTimer
                startTs={current?.startTs || null}
                endTs={current?.endTs || null}
                now={nowTick}
                label={
                  current
                    ? current.type === "ЧАС"
                      ? `Преостало у часу ${current.periodNo ?? ""}`.trim()
                      : "Преостало у одмору"
                    : "Ван школског распореда"
                }
              />

              {/* Fallback prikaz za slučaj da nema aktivnog segmenta */}
              {!current && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    {countdownMs > 0
                      ? "Следи следеће звоно"
                      : "Нема активних интервала"}
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>
                    {countdownMs > 0 ? formatMS(countdownMs) : "--:--"}
                  </Typography>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Sledeće zvono i odbrojavanje */}
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Следеће звоно: {nextTs ? formatClock(nextTs) : "—"}
              </Typography>
              {nextBell?.label && (
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {nextBell.label}
                </Typography>
              )}
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {nextTs ? formatHMS(countdownMs) : "Нема планираних звона"}
              </Typography>
              {/* Мини распоред данас */}
              <MiniSchedule
                rings={rings}
                segments={segments}
                now={nowTick}
                nextTs={nextTs}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
