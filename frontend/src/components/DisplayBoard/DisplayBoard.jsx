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
import CarouselAnnouncementBoard from "./CarouselAnnouncementBoard";
import alertSound from "../../assets/sounds/alert-gentle.mp3";

import {
  buildRings,
  buildSegments,
  formatClock,
  formatHMS,
  formatMS,
} from "../../utils/bell";

export default function DisplayBoard() {
  const [today, setToday] = useState(null);
  const [nextBell, setNextBell] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [announcements, setAnnouncements] = useState([]);
  const [overrideAnnouncement, setOverrideAnnouncement] = useState(null);

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  // ====== AUDIO UNLOCK STATE ======
  const [audioReady, setAudioReady] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);

  // 1) Init jednog Audio елемента + покушај тихог warmup-а и аутоматског unlock-а
  useEffect(() => {
    const audio = new Audio(alertSound);
    audio.volume = 1.0;
    audioRef.current = audio;

    // warmup
    const warm = new Audio(alertSound);
    warm.volume = 0;
    warm.play()
      .then(() => {
        warm.pause();
        warm.currentTime = 0;
      })
      .catch(() => {});

    // покушај аутоматског unlock-а на прву корисничку интеракцију
    const tryUnlockOnce = async () => {
      try {
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        setAudioReady(true);
        setShowUnlock(false);
        window.removeEventListener("pointerdown", tryUnlockOnce);
        window.removeEventListener("keydown", tryUnlockOnce);
      } catch {
        // и даље блокирано — омогући ручни unlock
      }
    };
    window.addEventListener("pointerdown", tryUnlockOnce, { once: true });
    window.addEventListener("keydown", tryUnlockOnce, { once: true });

    return () => {
      window.removeEventListener("pointerdown", tryUnlockOnce);
      window.removeEventListener("keydown", tryUnlockOnce);
    };
  }, []);

  // 2) Ручно откључавање звука (UI дугме)
  const unlockAudio = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioReady(true);
      setShowUnlock(false);
    } catch (e) {
      console.warn("Audio unlock failed:", e);
      setShowUnlock(true);
    }
  };

  // 3) Свирање звука — ако није откључано, прикажи UI
  const playAlertSound = () => {
    if (!audioRef.current) return;
    if (audioReady) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((e) => console.warn("play() blocked:", e));
      } catch (e) {
        console.warn("audio error:", e);
      }
    } else {
      setShowUnlock(true);
    }
  };

  // ========== DATA LOADS ==========

  // Учитaj активна обавештења на mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/announcements/active");
        const data = await res.json();
        setAnnouncements(data.items || []);
      } catch (e) {
        console.warn("Грешка при учитавању обавештења", e);
      }
    })();
  }, []);

  // Иницијално: данашњи распоред и следеће звоно
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [t, n] = await Promise.all([bellApi.getToday(), bellApi.getNext()]);
      if (!mounted) return;
      setToday(t);
      setNextBell(n);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 1s тикер
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Socket иницијализација и handler-и
  useEffect(() => {
    const url = import.meta.env.VITE_WS_BASE || "http://localhost:3000";
    const s = io(url, { transports: ["websocket"] });
    socketRef.current = s;

    const refetchActive = async () => {
      try {
        const res = await fetch("/api/announcements/active");
        const data = await res.json();
        setAnnouncements(data.items || []);
      } catch (e) {
        console.warn("Грешка при refetch-у активних обавештења:", e);
      }
    };

    // bell
    s.on("bell:next", (payload) => setNextBell(payload));
    s.on("bell:triggered", () => {});

    // announcements live updates
    s.on("announcement:created", refetchActive);
    s.on("announcement:updated", refetchActive);
    s.on("announcement:deleted", refetchActive);

    // push override + звук
    s.on("announcement:push", (data) => {
      setOverrideAnnouncement(data);
      playAlertSound();
      setTimeout(() => setOverrideAnnouncement(null), 60000);
    });

    return () => {
      s.disconnect();
    };
  }, [audioReady]);

  // ========== DERIVED TIMINGS ==========

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

  // ========== RENDER ==========

  return (
    <Box sx={{ p: 3}}>
      <Card sx={{ mx: "auto", textAlign: "center", p: 2, backgroundColor: "#d8d8d8"  }}>
        <CardContent>
          {announcements.length>0?<Typography variant="h5" gutterBottom>Обавештења</Typography>:""}
          

          <CarouselAnnouncementBoard items={announcements} override={overrideAnnouncement} />

          {isHoliday ? (
            <Typography variant="h5" color="text.secondary" sx={{ my: 2 }}>
              Данас је нерадни дан.
            </Typography>
          ) : (
            <>
              {/* Тренутни статус */}
              <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  sx={{fontSize: "32px" }}
                  label={current?.type || "Ван распореда"}
                  color={current?.type === "ЧАС" ? "error" : "success"}
                />
               {/*  {current?.type === "ЧАС" && (
                  <Chip label={`${current?.periodNo ?? "?"}. ЧАС `} color="success" />
                )} */}
              </Stack>

              {/* Преостало у текућем интервалу + progress bar */}
              <ProgressTimer
                startTs={current?.startTs || null}
                endTs={current?.endTs || null}
                now={nowTick}
                label={ current}
              />

              {/* Fallback ако нема активног сегмента */}
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

              {/* Следеће звоно и одбројавање */}
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Следеће звоно у {nextTs ? formatClock(nextTs) : "—"}{" "}
                {nextBell?.label ? (
                  <Box component="span" sx={{ textTransform: "lowercase" }}>
                    ({nextBell.label})
                  </Box>
                ) : null}
              </Typography>

              {/* Мини распоред за данас (по потреби укључити) */}
              {/* <MiniSchedule
                rings={rings}
                segments={segments}
                now={nowTick}
                nextTs={nextTs}
              /> */}
            </>
          )}

          {/* Једнократни UI за откључавање звука */}
          {showUnlock && !audioReady && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Звук је блокиран у прегледачу. Омогући да би се чуо аларм за хитна обавештења.
              </Typography>
              <Stack direction="row" justifyContent="center">
                <Chip
                  label="Укључи звук"
                  color="primary"
                  onClick={unlockAudio}
                  sx={{ px: 2, fontWeight: 600 }}
                />
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
