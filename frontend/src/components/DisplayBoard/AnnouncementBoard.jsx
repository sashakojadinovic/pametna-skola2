/**
 * File: AnnouncementBoard.jsx
 * Path: /src/components/DisplayBoard/AnnouncementBoard.jsx
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState } from "react";
import { Typography, Box, Alert, Fade } from "@mui/material";
import DOMPurify from "dompurify";

const priorityAccent = {
  NORMAL: "info.main",
  HIGH: "warning.main",
  URGENT: "error.main",
};

export default function CarouselAnnouncementBoard({ items = [], override = null }) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const visibleItem = useMemo(() => {
    if (!items.length) return null;
    return items[index % items.length];
  }, [items, index]);

  // Dinamičko trajanje slajda prema dužini teksta
  const currentDuration = useMemo(() => {
    if (!visibleItem) return 10000;
    const textLen = (visibleItem.title?.length || 0) + (visibleItem.body?.length || 0);
    const extra = Math.min(12000, Math.ceil(textLen / 90) * 1000); // +1s na ~90 karaktera
    return 8000 + extra; // 8s baza
  }, [visibleItem]);

  // Automatska rotacija — pauziraj kada postoji override
  useEffect(() => {
    if (!items.length || override) return;
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setFadeIn(true);
      }, 350);
    }, currentDuration);
    return () => clearInterval(id);
  }, [items, override, currentDuration]);

  if (!items.length && !override) return null;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Push обавештење (override) */}
      <Fade in={Boolean(override)} mountOnEnter unmountOnExit>
        <Alert
          severity="info"
          icon={false}
          sx={{
            fontSize: "clamp(20px, 3.6vw, 42px)",
            fontWeight: 800,
            px: 2,
            py: 1.5,
            borderLeft: 0,
            bgcolor: "action.hover",
          }}
        >
          📢 {override?.title ? `${override.title}: ` : ""}
          <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(override?.body || "") }} />
        </Alert>
      </Fade>

      {/* Carousel prikaz — radi само кад нема override */}
      {!override && visibleItem && (
        <Fade in={fadeIn} timeout={400}>
          <Box
            key={visibleItem.id}
            sx={{
              px: 2,
              py: 1.5,
              borderLeft: (t) => `8px solid ${t.palette[priorityAccentKey(visibleItem.priority)].main}`,
              bgcolor: "transparent",
              minHeight: 140,
            }}
          >
            <Typography variant="h2" sx={{ fontSize: "clamp(24px, 4.8vw, 56px)", fontWeight: 800, mb: 0.5 }}>
              {visibleItem.title}
            </Typography>
            {visibleItem.body && (
              <Typography
                component="div"
                sx={{ fontSize: "clamp(16px, 2.6vw, 28px)", lineHeight: 1.25, opacity: 0.95 }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(visibleItem.body) }}
              />
            )}

            {/* Page dots */}
            {items.length > 1 && (
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                {items.map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      opacity: i === index ? 1 : 0.35,
                      bgcolor: (t) => t.palette[priorityAccentKey(visibleItem.priority)].main,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Fade>
      )}
    </Box>
  );
}

function priorityAccentKey(priority) {
  if (priority === "URGENT") return "error";
  if (priority === "HIGH") return "warning";
  return "info";
}
