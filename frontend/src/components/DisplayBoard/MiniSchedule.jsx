/**
 * File: MiniSchedule.jsx
 * Path: /frontend/src/components/DisplayBoard
 * Author: Saša Kojadinović
 */

import { useMemo } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";
import { formatClock } from "../../utils/bell";

/**
 * Prikaz liste zvona za данас sa isticanjem:
 *  - текућег интервала (означеног преко segments)
 *  - следећег звона (nextTs)
 *
 * Props:
 *  - rings: [{ ts: Date, label: string }]
 *  - segments: [{ startTs, endTs, type, periodNo, ... }]
 *  - now: number (Date.now())
 *  - nextTs: Date | null
 */
export default function MiniSchedule({ rings = [], segments = [], now, nextTs }) {
  const nowDate = useMemo(() => new Date(now), [now]);

  // Pronađi aktivan segment, da bismo istakli zvona koja ga omeđuju
  const activeSeg = useMemo(() => {
    for (const s of segments) {
      if (nowDate >= s.startTs && nowDate < s.endTs) return s;
    }
    return null;
  }, [segments, nowDate]);

  // Mapiramo svako zvono sa metapodacima za isticanje
  const items = useMemo(() => {
    return rings.map((r, idx) => {
      const isStartOfActive =
        activeSeg && +r.ts === +activeSeg.startTs; // +Date → timestamp broj
      const isEndOfActive =
        activeSeg && idx > 0 && +r.ts === +activeSeg.endTs;
      const isNext = nextTs && +r.ts === +nextTs;

      let secondary = r.label || "";
      if (isStartOfActive && activeSeg?.type === "ЧАС") {
        secondary = `Почетак часа ${activeSeg.periodNo}${
          r.label ? ` – ${r.label}` : ""
        }`;
      } else if (isStartOfActive && activeSeg?.type === "ОДМОР") {
        secondary = `Почетак одмора${r.label ? ` – ${r.label}` : ""}`;
      } else if (isEndOfActive && activeSeg?.type === "ЧАС") {
        secondary = `Крај часа ${activeSeg.periodNo}${
          r.label ? ` – ${r.label}` : ""
        }`;
      } else if (isEndOfActive && activeSeg?.type === "ОДМОР") {
        secondary = `Крај одмора${r.label ? ` – ${r.label}` : ""}`;
      }

      return {
        key: idx,
        time: formatClock(r.ts),
        primary: secondary || "—",
        isNext,
        isBoundary: isStartOfActive || isEndOfActive,
      };
    });
  }, [rings, activeSeg, nextTs]);

  if (!rings.length) return null;

  return (
    <Box sx={{ mt: 3, textAlign: "left" }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Данашњи распоред
      </Typography>
      <List disablePadding>
        {items.map((it, i) => (
          <Box key={it.key}>
            <ListItem
              sx={{
                py: 1,
                borderRadius: 2,
                bgcolor: it.isBoundary ? "action.hover" : "transparent",
              }}
              secondaryAction={
                it.isNext ? <Chip label="Следеће" color="primary" size="small" /> : null
              }
            >
              <ListItemText
                primaryTypographyProps={{
                  variant: "body1",
                  sx: { fontWeight: it.isBoundary ? 600 : 400 },
                }}
                secondaryTypographyProps={{ variant: "body2" }}
                primary={`${it.time}`}
                secondary={it.primary}
              />
            </ListItem>
            {i < items.length - 1 && <Divider component="li" />}
          </Box>
        ))}
      </List>
    </Box>
  );
}
