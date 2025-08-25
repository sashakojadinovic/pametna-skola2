/**
 * File: DayScheduleCalendar.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Tooltip,
  Grid, Divider, TextField, MenuItem
} from "@mui/material";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/sr";
import bellApi from "../../api/bellApi";
import TemplateSelect from "./TemplateSelect";
import RingNowButton from "./RingNowButton";
import api from "../../api/axiosInstance"; // ⬅️ za /playlists

dayjs.locale("sr");

function fmtDate(d) { return dayjs(d).format("YYYY-MM-DD"); }
function startEndForMonth(monthDayjs) {
  const firstOfMonth = monthDayjs.startOf("month");
  const start = firstOfMonth.startOf("week");
  const end = firstOfMonth.endOf("month").endOf("week");
  return { from: fmtDate(start), to: fmtDate(end) };
}

function DayRenderer(props) {
  const { day, outsideCurrentMonth, onSelectToggle, meta } = props;
  const ymd = fmtDate(day);
  const row = meta.byDate.get(ymd);
  const isSelected = meta.selected.has(ymd);
  const isHoliday = Boolean(row?.is_holiday);
  const hasTemplate = Boolean(row?.template_name);
  const color = row?.template_color || "#1976d2";

  return (
    <Box sx={{ position: "relative" }}>

      <PickersDay
        {...props}
        outsideCurrentMonth={outsideCurrentMonth}
        onClick={(e) => { e.stopPropagation(); onSelectToggle(ymd, e); }}
        selected={isSelected}
        sx={{
          ...(day.isSame(dayjs(), "day") && { border: (t) => `1px solid ${t.palette.primary.main}` }),
          ...(isHoliday && {
            bgcolor: (t) => (props.selected ? t.palette.error.light : t.palette.error.lighter),
            "&:hover": { bgcolor: (t) => (props.selected ? t.palette.error.light : t.palette.error.lighter), opacity: 0.9 },
          }),
        }}
      />
      {isHoliday && (
        <Chip
          label="Н"
          size="small"
          color="error"
          sx={{ position: "absolute", top: 2, right: 2, height: 18, fontSize: 11, minWidth: 0, px: 0.5 }}
        />
      )}
      {hasTemplate && (
        <Box
          sx={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: color,
          }}
          title={row.template_name}
        />
      )}
    </Box>
  );
}

export default function DayScheduleCalendar() {
  const [month, setMonth] = useState(dayjs());
  const [{ from, to }, setRange] = useState(() => startEndForMonth(dayjs()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(new Set());

  // Single-day dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState(null);
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [editHoliday, setEditHoliday] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editPlaylistId, setEditPlaylistId] = useState(null); // ⬅️ NOVO

  // Bulk
  const [bulkTemplateId, setBulkTemplateId] = useState(null);
  const [bulkPlaylistId, setBulkPlaylistId] = useState("");   // "" = bez muzike  ⬅️ NOVO

  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const byDate = useMemo(() => {
    const map = new Map();
    for (const r of rows) map.set(r.date, r);
    return map;
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bellApi.getDaySchedule({ from, to });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      setToast({ open: true, message: "Грешка при учитавању распореда.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleMonthChange = (newMonth) => {
    setMonth(newMonth);
    setRange(startEndForMonth(newMonth));
  };

  const toggleSelect = (ymd, evt) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (evt?.shiftKey) {
        const all = Array.from({ length: dayjs(to).diff(dayjs(from), "day") + 1 }, (_, i) =>
          fmtDate(dayjs(from).add(i, "day"))
        );
        const idxClicked = all.indexOf(ymd);
        const nearest = [...next]
          .map((d) => all.indexOf(d))
          .filter((i) => i >= 0)
          .sort((a, b) => Math.abs(a - idxClicked) - Math.abs(b - idxClicked))[0];
        if (nearest >= 0) {
          const [a, b] = [nearest, idxClicked].sort((x, y) => x - y);
          for (let i = a; i <= b; i++) next.add(all[i]);
          return next;
        }
      }
      if (next.has(ymd)) next.delete(ymd); else next.add(ymd);
      return next;
    });
  };

  const openEdit = (ymd) => {
    const row = byDate.get(ymd);
    setEditDate(ymd);
    setEditTemplateId(row?.bell_template_id || null);
    setEditHoliday(Boolean(row?.is_holiday));
    setEditNote(row?.note || "");
    setEditPlaylistId(row?.playlist_id || null); // ⬅️ NOVO
    setEditOpen(true);
  };

  // playlists fetch
  const [playlists, setPlaylists] = useState([]); // ⬅️ NOVO
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/playlists");
        setPlaylists(Array.isArray(res.data) ? res.data : []);
      } catch {
        setPlaylists([]);
      }
    })();
  }, []);

  const saveEdit = async () => {
    try {
      await bellApi.putDay(editDate, {
        bell_template_id: editTemplateId,
        playlist_id: editPlaylistId, // ⬅️ NOVO
        is_holiday: editHoliday,
        note: editNote || null,
      });
      setEditOpen(false);
      setToast({ open: true, message: "Сачувано.", severity: "success" });
      load();
    } catch {
      setToast({ open: true, message: "Неуспешно чување.", severity: "error" });
    }
  };

  // Bulk akcije
  const applyBulkTemplate = async () => {
    if (!bulkTemplateId || selected.size === 0) return;
    try {
      await Promise.all([...selected].map((d) =>
        bellApi.putDay(d, { bell_template_id: bulkTemplateId, is_holiday: false })
      ));
      setToast({ open: true, message: "Шаблон примењен.", severity: "success" });
      load();
    } catch {
      setToast({ open: true, message: "Грешка при примени шаблона.", severity: "error" });
    }
  };

  const applyBulkPlaylist = async () => { // ⬅️ NOVO
    if (selected.size === 0) return;
    try {
      const plId = bulkPlaylistId ? Number(bulkPlaylistId) : null;
      await Promise.all([...selected].map((d) =>
        bellApi.putDay(d, { playlist_id: plId })
      ));
      setToast({ open: true, message: "Плејлиста примењена.", severity: "success" });
      load();
    } catch {
      setToast({ open: true, message: "Грешка при примени плејлисте.", severity: "error" });
    }
  };

  const clearBulk = () => setSelected(new Set());

  const meta = useMemo(() => ({ byDate, selected }), [byDate, selected]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Календар распореда</Typography>

      <Card>
        <CardContent>

          {/* GRID LAYOUT: Лево календар, десно sidebar */}
          <Grid>
            <Grid item xs={12} md={8}>

              <Card variant="outlined">
                <CardContent>
                  <DateCalendar
                    value={month}
                    onChange={() => { }}
                    onMonthChange={handleMonthChange}
                    reduceAnimations
                    disableHighlightToday={false}
                    slots={{
                      day: (p) => (
                        <DayRenderer
                          {...p}
                          onSelectToggle={(ymd, e) => {
                            if (e?.metaKey || e?.ctrlKey || e?.shiftKey) toggleSelect(ymd, e);
                            else { toggleSelect(ymd, e); openEdit(ymd); }
                          }}
                          meta={meta}
                        />
                      ),
                    }}
                  />

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Chip size="small" variant="outlined" label="Боја тачке = шаблон" />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Масовне акције <Chip label={`Изабрано: ${selected.size}`} size="small" /></Typography>

                  <Typography color="text.secondary">{loading ? "Учитавање…" : ""}</Typography>

                  <Stack spacing={1.5}>
                    <TemplateSelect
                      value={bulkTemplateId}
                      onChange={setBulkTemplateId}
                      label="Шаблон за примену"
                      fullWidth
                      sx={{ minWidth: { xs: '100%', sm: 320 } }}
                    />

                    <Tooltip title="Примени шаблон на изабране дане">
                      <span>
                        <Button
                          variant="contained"
                          disabled={selected.size === 0}
                          onClick={applyBulkTemplate}
                          fullWidth
                        >
                          Примени шаблон ({selected.size})
                        </Button>
                      </span>
                    </Tooltip>

                    {/* ⬇️ NOVO: Bulk playlist controls */}
                    <TextField
                      select
                      fullWidth
                      label="🎵 Плејлиста за примену"
                      value={bulkPlaylistId}
                      onChange={(e) => setBulkPlaylistId(e.target.value)}
                      sx={{ mt: 1 }}
                    >
                      <MenuItem value="">(Без музике)</MenuItem>
                      {playlists.map((pl) => (
                        <MenuItem key={pl.id} value={String(pl.id)}>{pl.name}</MenuItem>
                      ))}
                    </TextField>

                    <Tooltip title="Примени плејлисту на изабране дане (или 'Без музике')">
                      <span>
                        <Button
                          variant="outlined"
                          disabled={selected.size === 0}
                          onClick={applyBulkPlaylist}
                          fullWidth
                        >
                          Примени плејлисту ({selected.size})
                        </Button>
                      </span>
                    </Tooltip>

                    <Button onClick={clearBulk} disabled={selected.size === 0} fullWidth>
                      Очисти избор
                    </Button>

                    <Divider />
                    <RingNowButton />

                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>

        {/* Single-day dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Подешавање дана — {editDate}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TemplateSelect value={editTemplateId} onChange={setEditTemplateId} label="Шаблон звона" fullWidth />
              <TextField
                select
                fullWidth
                label="🎵 Плејлиста (опционо)"
                value={editPlaylistId || ""}
                onChange={(e) => setEditPlaylistId(e.target.value || null)}
              >
                <MenuItem value="">Без музике</MenuItem>
                {playlists.map((pl) => (
                  <MenuItem key={pl.id} value={pl.id}>{pl.name}</MenuItem>
                ))}
              </TextField>
              <textarea
                placeholder="Напомена (опционо)"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: 8, border: "1px solid var(--mui-palette-divider)" }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Откажи</Button>
            <Button onClick={saveEdit} variant="contained">Сачувај</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
        </Snackbar>
      </Card>
    </Box>
  );
}
