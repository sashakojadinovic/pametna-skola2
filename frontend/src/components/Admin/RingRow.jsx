/**
 * File: RingRow.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { Stack, TextField, IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

// "HH:MM" -> Dayjs | null
function hhmmToDayjs(hhmm) {
  if (!/^\d{2}:\d{2}$/.test(hhmm || "")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return dayjs().hour(h).minute(m).second(0).millisecond(0);
}

export default function RingRow({ value, onChange, onDelete, error }) {
  const { time = "", label = "" } = value || {};
  const timeObj = hhmmToDayjs(time);

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
      <TimePicker
        label="Време"
        ampm={false}                 // ⬅️ forsira 24h
        format="HH:mm"               // ⬅️ prikaz i parsing
        views={["hours", "minutes"]}
        minutesStep={1}
        value={timeObj}
        onChange={(val) => {
          const next = val && val.isValid() ? val.format("HH:mm") : "";
          onChange?.({ ...value, time: next });
        }}
        // Stil i error na ugrađenom TextField-u:
        slotProps={{
          textField: {
            sx: { width: 160 },
            error: Boolean(error),
            helperText: error ? "Формат HH:MM" : " ",
            InputLabelProps: { shrink: true },
          },
        }}
      />

      <TextField
       sx={{bottom:'11px'}}
        label="Опис"
        value={label}
        onChange={(e) => onChange?.({ ...value, label: e.target.value })}
        fullWidth
      />

      <Tooltip title="Обриши звоно">
        <IconButton  onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
