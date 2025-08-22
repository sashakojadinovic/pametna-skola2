/**
 * File: ProgressTimer.jsx
 * Path: /frontend/src/components/DisplayBoard
 * Author: Saša Kojadinović
 */

import { Box, LinearProgress, Typography } from "@mui/material";

/**
 * Prikazuje preostalo vreme i napredak unutar tekućeg intervala.
 * Props:
 *  - startTs: Date
 *  - endTs: Date
 *  - now: number (Date.now())
 *  - label: string (нпр. "Час 3" ili "Одмор")
 */
export default function ProgressTimer({ startTs, endTs, now, label }) {
  if (!startTs || !endTs) return null;

  const start = startTs.getTime();
  const end = endTs.getTime();
  const total = Math.max(0, end - start);
  const elapsed = Math.min(Math.max(0, now - start), total);
  const remaining = Math.max(0, end - now);

  const value = total > 0 ? Math.round((elapsed / total) * 100) : 0;

  const mm = Math.floor(remaining / 1000 / 60);
  const ss = Math.floor((remaining / 1000) % 60);

  return (
    <Box sx={{ width: "100%", textAlign: "center" }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </Typography>
      <LinearProgress color="secondary" variant="determinate" value={value} sx={{ height: 10, borderRadius: 2 }} />
    </Box>
  );
}
