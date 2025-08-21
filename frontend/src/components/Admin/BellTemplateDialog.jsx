/**
 * File: BellTemplateDialog.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import AddIcon from "@mui/icons-material/Add";
import bellApi from "../../api/bellApi";
import RingRow from "./RingRow";

function parseSpec(json_spec) {
  try {
    const spec = typeof json_spec === "string" ? JSON.parse(json_spec) : json_spec;
    return Array.isArray(spec?.rings) ? spec.rings : [];
  } catch {
    return [];
  }
}

function isValidTime(hhmm) {
  return /^\d{2}:\d{2}$/.test(hhmm || "");
}

export default function BellTemplateDialog({ open, onClose, initialData, onSaved, onError }) {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rings, setRings] = useState([]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setRings(parseSpec(initialData.json_spec));
    } else {
      setName("");
      setDescription("");
      setRings([
        { time: "08:00", label: "Почетак 1." },
        { time: "08:45", label: "Крај 1." },
      ]);
    }
  }, [open, isEdit, initialData]);

  const valid = useMemo(() => {
    if (!name.trim()) return false;
    if (!Array.isArray(rings) || rings.length < 1) return false;
    for (const r of rings) {
      if (!isValidTime(r.time)) return false;
    }
    return true;
  }, [name, rings]);

  const sortedRings = useMemo(() => {
    const copy = [...rings];
    copy.sort((a, b) => a.time.localeCompare(b.time));
    return copy;
  }, [rings]);

  const addRing = () => {
    setRings((arr) => [...arr, { time: "09:00", label: "" }]);
  };

  const sortRings = () => {
    setRings(sortedRings);
  };

  const save = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      json_spec: { rings: sortedRings.map((r) => ({ time: r.time, label: r.label || "" })) },
    };
    try {
      if (isEdit) {
        await bellApi.updateTemplate(initialData.id, payload);
      } else {
        await bellApi.createTemplate(payload);
      }
      onSaved?.();
    } catch (e) {
      onError?.("Неуспешно чување шаблона.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Уреди шаблон" : "Нови шаблон"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Назив*"
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="Обавезно поље"
            fullWidth
          />
          <TextField
            label="Опис"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Divider />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Звона</Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Сортирај по времену">
                <IconButton onClick={sortRings}><SortIcon /></IconButton>
              </Tooltip>
              <Button startIcon={<AddIcon />} onClick={addRing} variant="outlined">
                Додај звоно
              </Button>
            </Stack>
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
                onDelete={() => {
                  setRings((arr) => arr.filter((_, i) => i !== idx));
                }}
                error={!isValidTime(r.time)}
              />
            ))}
            {rings.length === 0 && <Typography color="text.secondary">Нема звона — додај бар једно.</Typography>}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Откажи</Button>
        <Button onClick={save} variant="contained" disabled={!valid}>
          Сачувај
        </Button>
      </DialogActions>
    </Dialog>
  );
}
