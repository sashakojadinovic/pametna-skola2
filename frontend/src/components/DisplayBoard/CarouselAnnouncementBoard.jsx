/**
 * File: CarouselAnnouncementBoard.jsx
 * Path: /frontend/src/components/DisplayBoard
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Fade,
} from "@mui/material";
import DOMPurify from "dompurify";

const priorityColor = {
  NORMAL: "primary",
  HIGH: "warning",
  URGENT: "error",
};

export default function CarouselAnnouncementBoard({ items = [], override = null }) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const visibleItem = useMemo(() => {
    if (!items.length) return null;
    return items[index % items.length];
  }, [items, index]);

  // Automatska rotacija — pauziraj kada postoji override
  useEffect(() => {
    if (!items.length || override) return;

    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setFadeIn(true);
      }, 400);
    }, 15000);

    return () => clearInterval(interval);
  }, [items, override]);

  if (!items.length && !override) return null;

  return (
    <Box sx={{ mb: 3, minHeight: 220 }}>
      {/* Push obaveštenje (override) — prikazuje se samo dok roditelj prosleđuje prop */}
      <Fade in={Boolean(override)} mountOnEnter unmountOnExit>
        <Alert
          severity="info"
          sx={{
            mb: 2,
            fontSize: 30,
            fontWeight: "bold",
            borderLeft: "6px solid",
            borderColor: "info.main",
          }}
        >
          📢 Хитно обавештење:  {override?.body}
        </Alert>
      </Fade>

      {/* Carousel prikaz — radi samo kad nema override */}
      {!override && visibleItem && (
        <Fade in={fadeIn} timeout={500}>
          <Box>
            <Card
              key={visibleItem.id}
              sx={{
                borderTop: `6px solid`,
                borderColor: `${priorityColor[visibleItem.priority] || "info"}.main`,
                minHeight: 180,
                backgroundColor: "#efefef"
              }}
            >
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  {visibleItem.title}
                </Typography>
                {visibleItem.body && (
                  <Typography
                    sx={{
                      mb: 2,
                      fontSize: 30,

                    }}
                    variant="body1"
                    component="div"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(visibleItem.body),
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Typography
              variant="caption"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              Обавештење {index + 1} од {items.length}
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
}
