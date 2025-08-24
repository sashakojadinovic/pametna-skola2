/**
 * File: BellTemplateDialog.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, Typography, Divider, IconButton, Tooltip, Box,
  Select, MenuItem
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import AddIcon from "@mui/icons-material/Add";
import bellApi from "../../api/bellApi";
import RingRow from "./RingRow";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

// utili
function parseSpec(json_spec) {
  try {
    const spec = typeof json_spec === "string" ? JSON.parse(json_spec) : json_spec;
    return Array.isArray(spec?.rings) ? spec.rings : [];
  } catch {
    return [];
  }
}
function isValidTime(hhmm) { return /^\d{2}:\d{2}$/.test(hhmm || ""); }
function isHexColor(v) { return /^#([0-9a-fA-F]{6})$/.test(v || ""); }

function addMinutesToHHMM(hhmm, minutes) {
  const t = dayjs(hhmm, "HH:mm").add(minutes, "minute");
  return t.format("HH:mm");
}

export default function BellTemplateDialog({ open, onClose, initialData, onSaved, onError }) {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rings, setRings] = useState([]);
  const [color, setColor] = useState("#1976d2");
  const [intervalMin, setIntervalMin] = useState(5);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setRings(parseSpec(initialData.json_spec));
      setColor(initialData.color || "#1976d2");
    } else {
      setName("");
      setDescription("");
      setRings([
        { time: "08:00", label: "Почетак 1. часа" },
        { time: "08:45", label: "Крај 1. часа" },
      ]);
      setColor("#1976d2");
    }
  }, [open, isEdit, initialData]);

  const valid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isHexColor(color)) return false;
    if (!Array.isArray(rings) || rings.length < 1) return false;
    for (const r of rings) if (!isValidTime(r.time)) return false;
    return true;
  }, [name, rings, color]);

  const sortedRings = useMemo(() => {
    const copy = [...rings];
    copy.sort((a, b) => a.time.localeCompare(b.time));
    return copy;
  }, [rings]);

  const addRing = () => setRings((arr) => [...arr, { time: "08:00", label: "" }]);
  const sortRings = () => setRings(sortedRings);

  const addRingByInterval = () => {
    if (!Array.isArray(rings) || rings.length === 0) return;
    const last = sortedRings[sortedRings.length - 1];
    const nextTime = addMinutesToHHMM(last.time, intervalMin);
    const isDup = rings.some(r => r.time === nextTime);
    const crossesDay = dayjs(nextTime, "HH:mm").isBefore(dayjs(last.time, "HH:mm"));

    if (crossesDay) {
      onError?.("Следеће звоно би пало у наредни дан.");
      return;
    }
    if (isDup) {
      onError?.("Звоно за то време већ постоји.");
      return;
    }

    setRings(arr => [...arr, { time: nextTime, label: "" }]);
  };

  const save = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      json_spec: { rings: sortedRings.map((r) => ({ time: r.time, label: r.label || "" })) },
    };
    try {
      if (isEdit) await bellApi.updateTemplate(initialData.id, payload);
      else await bellApi.createTemplate(payload);
      onSaved?.();
    } catch {
      onError?.("Неуспешно чување шаблона.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: "#efefef" }}>{isEdit ? "Уреди шаблон" : "Нови шаблон"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="Назив*" value={name} onChange={(e) => setName(e.target.value)} helperText="Обавезно поље" />
          <TextField label="Опис" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body1">Боја шaблона</Typography>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 48, height: 32, border: "none", background: "transparent", cursor: "pointer" }}
              aria-label="Избор боје шaблона"
            />
            <Typography variant="body2" color="text.secondary">{color}</Typography>
          </Box>

          <Divider />

          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Звона</Typography>
            <Tooltip title="Сортирај по времену">
              <IconButton onClick={sortRings}><SortIcon /></IconButton>
            </Tooltip>
            {rings.length === 0 ? (
              <Button startIcon={<AddIcon />} onClick={addRing} variant="outlined">Додај звоно</Button>
            ) : (
              <>
                <Select
                  size="small"
                  value={intervalMin}
                  onChange={(e) => setIntervalMin(Number(e.target.value))}
                  sx={{ minWidth: 90 }}
                  aria-label="Интервал"
                >
                  {[5, 10, 15, 20, 30, 35, 45].map(v => (
                    <MenuItem key={v} value={v}>{v} мин</MenuItem>
                  ))}
                </Select>
                <Button variant="contained" onClick={addRingByInterval}>
                  Додај по интервалу
                </Button>
              </>
            )}

          </Stack>

          <Stack spacing={1}>
            {rings.map((r, idx) => (
              <RingRow
                key={idx}
                value={r}
                onChange={(val) => {
                  setRings((arr) => {
                    const copy = [...arr];
                    copy[idx] = val;
                    return copy;
                  });
                }}
                onDelete={() => setRings((arr) => arr.filter((_, i) => i !== idx))}
                error={!isValidTime(r.time)}
              />
            ))}
            {rings.length === 0 && <Typography color="text.secondary">Нема звона — додај бар једно.</Typography>}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Откажи</Button>
        <Button onClick={save} variant="contained" disabled={!valid}>Сачувај</Button>
      </DialogActions>
    </Dialog>
  );
}