/**
 * File: AnnouncementDialog.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Button, MenuItem, FormControlLabel, Switch
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

export default function AnnouncementDialog({ open, onClose, initialData = null, onSaved }) {
  const isEdit = Boolean(initialData?.id);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [startTs, setStartTs] = useState("");
  const [endTs, setEndTs] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setPriority(initialData.priority || "NORMAL");
      setStartTs(initialData.start_ts?.slice(0, 16) || "");
      setEndTs(initialData.end_ts?.slice(0, 16) || "");
      setIsActive(initialData.is_active ?? true);
    } else {
      setTitle("");
      setBody("");
      setPriority("NORMAL");
      setStartTs(dayjs().format("YYYY-MM-DDTHH:mm"));
      setEndTs(dayjs().add(1, "day").format("YYYY-MM-DDTHH:mm"));
      setIsActive(true);
    }
  }, [open, isEdit, initialData]);

  const valid = useMemo(() => {
    return (
      title.trim().length > 0 &&
      startTs &&
      endTs &&
      dayjs(endTs).isAfter(dayjs(startTs))
    );
  }, [title, startTs, endTs]);

  const handleSubmit = async () => {
    const payload = {
      title: title.trim(),
      body: body.trim(),
      priority,
      start_ts: new Date(startTs).toISOString(),
      end_ts: new Date(endTs).toISOString(),
      is_active: isActive,
    };

    try {
      if (isEdit) {
        await fetch(`/api/announcements/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onSaved?.();
      onClose();
    } catch (e) {
      alert("Грешка при чувању.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Измени обавештење" : "Ново обавештење"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Наслов"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Текст (HTML дозвољен)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
          <TextField
            label="Приоритет"
            select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            fullWidth
          >
            <MenuItem value="NORMAL">Нормално</MenuItem>
            <MenuItem value="HIGH">Висок</MenuItem>
            <MenuItem value="URGENT">Хитно</MenuItem>
          </TextField>

          <TextField
            label="Почетак приказа"
            type="datetime-local"
            value={startTs}
            onChange={(e) => setStartTs(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Крај приказа"
            type="datetime-local"
            value={endTs}
            onChange={(e) => setEndTs(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Активно"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Откажи</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!valid}>
          Сачувај
        </Button>
      </DialogActions>
    </Dialog>
  );
}
