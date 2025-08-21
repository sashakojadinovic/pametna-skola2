/**
 * File: DayScheduleCalendar.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/sr";
import bellApi from "../../api/bellApi";
import TemplateSelect from "./TemplateSelect";

dayjs.locale("sr");

function fmtDate(d) {
  return dayjs(d).format("YYYY-MM-DD");
}

function startEndForMonth(monthDayjs) {
  // Uhvati sve dane koje DateCalendar prikaže: od prvog prikazanog ponedeljka do poslednje nedelje
  const firstOfMonth = monthDayjs.startOf("month");
  const start = firstOfMonth.startOf("week"); // nedelja kao početak (u sr lokalizaciji: pon kao 1, ali MUI koristi Sun baseline)
  const end = firstOfMonth.endOf("month").endOf("week");
  return { from: fmtDate(start), to: fmtDate(end) };
}

/**
 * Custom render dana:
 * - označi selektovane dane (selectedSet)
 * - prikaži chip "Н" za нерадни
 * - mala tačka za šablon (razlikuje “ima šablon” vs “nema”)
 */
function DayRenderer(props) {
  const { day, outsideCurrentMonth, onSelectToggle, meta } = props;
  const ymd = fmtDate(day);
  const row = meta.byDate.get(ymd);
  const isSelected = meta.selected.has(ymd);
  const isHoliday = Boolean(row?.is_holiday);
  const hasTemplate = Boolean(row?.template_name);

  return (
    <Box sx={{ position: "relative" }}>
      <PickersDay
        {...props}
        outsideCurrentMonth={outsideCurrentMonth}
        onClick={(e) => {
          e.stopPropagation();
          onSelectToggle(ymd, e);
        }}
        selected={isSelected}
        sx={{
          // ⬇️ uvećaj dimenzije dana
          width: 46,
          height: 46,
          fontSize: "1rem",
          // istakni današnji
          ...(day.isSame(dayjs(), "day") && {
            border: (theme) => `1px solid ${theme.palette.primary.main}`,
          }),
          ...(isHoliday && {
            bgcolor: (theme) =>
              (props.selected ? theme.palette.error.light : theme.palette.error.lighter),
            "&:hover": {
              bgcolor: (theme) =>
                (props.selected ? theme.palette.error.light : theme.palette.error.lighter),
              opacity: 0.9,
            },
          }),
        }}
      />
      {/* Chip "Н" za neradni, gore desno */}
      {isHoliday && (
        <Chip
          label="Н"
          size="small"
          color="error"
          sx={{
            position: "absolute",
            top: 3,
            right: 3,
            height: 18,
            fontSize: 11,
            minWidth: 0,
            px: 0.5,
          }}
        />
      )}
      {/* Tačkica za šablon, dole centrirano */}
      {hasTemplate && (
        <Box
          sx={{
            position: "absolute",
            bottom: 5,
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "primary.main",
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

  // selection
  const [selected, setSelected] = useState(() => new Set());

  // single-day dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState(null);
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [editHoliday, setEditHoliday] = useState(false);
  const [editNote, setEditNote] = useState("");

  // bulk toolbar state
  const [bulkTemplateId, setBulkTemplateId] = useState(null);
  const [bulkHoliday, setBulkHoliday] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  const handleMonthChange = (newMonth) => {
    setMonth(newMonth);
    setRange(startEndForMonth(newMonth));
  };

  // Toggle selection
  const toggleSelect = (ymd, evt) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (evt?.shiftKey) {
        // SHIFT: selektuj raspon od najbližeg selektovanog do kliknutog
        if (next.size > 0) {
          const all = Array.from({ length: dayjs(to).diff(dayjs(from), "day") + 1 }, (_, i) =>
            fmtDate(dayjs(from).add(i, "day"))
          );
          // nađi najbliži selektovani po indeksu
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
      }
      // regular toggle
      if (next.has(ymd)) next.delete(ymd);
      else next.add(ymd);
      return next;
    });
  };

  // Single-day dialog open
  const openEdit = (ymd) => {
    const row = byDate.get(ymd);
    setEditDate(ymd);
    setEditTemplateId(row?.bell_template_id || null);
    setEditHoliday(Boolean(row?.is_holiday));
    setEditNote(row?.note || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      await bellApi.putDay(editDate, {
        bell_template_id: editTemplateId,
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
      await Promise.all(
        [...selected].map((d) =>
          bellApi.putDay(d, { bell_template_id: bulkTemplateId, is_holiday: false })
        )
      );
      setToast({ open: true, message: "Шаблон примењен.", severity: "success" });
      load();
    } catch {
      setToast({ open: true, message: "Грешка при примени шаблона.", severity: "error" });
    }
  };

  const applyBulkHoliday = async () => {
    if (selected.size === 0) return;
    try {
      await Promise.all(
        [...selected].map((d) =>
          bellApi.putDay(d, { bell_template_id: null, is_holiday: true })
        )
      );
      setToast({ open: true, message: "Означено као нерадни дан.", severity: "success" });
      load();
    } catch {
      setToast({ open: true, message: "Грешка при означавању.", severity: "error" });
    }
  };

  const clearBulk = () => setSelected(new Set());

  // Klik na dan: Ctrl/Meta = toggle, dupli klik = single-day dialog
  const onDayClick = (ymd, e) => {
    if (e?.metaKey || e?.ctrlKey || e?.shiftKey) {
      toggleSelect(ymd, e);
    } else {
      // single click: toggle + otvori editor
      toggleSelect(ymd, e);
      openEdit(ymd);
    }
  };

  // metadata za DayRenderer
  const meta = useMemo(() => ({ byDate, selected }), [byDate, selected]);

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5">Календар распореда</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
            <Tooltip title="Примени шаблон на изабране дане">
              <span>
                <Button variant="contained" disabled={selected.size === 0 || !bulkTemplateId} onClick={applyBulkTemplate}>
                  Примени шаблон ({selected.size})
                </Button>
              </span>
            </Tooltip>
            <TemplateSelect value={bulkTemplateId} onChange={setBulkTemplateId} label="Шаблон за примену" />
            <Button variant="outlined" color="error" disabled={selected.size === 0} onClick={applyBulkHoliday}>
              Нерадни ({selected.size})
            </Button>
            <Button onClick={clearBulk} disabled={selected.size === 0}>
              Очисти избор
            </Button>
            <Typography color="text.secondary">{loading ? "Учитавање…" : " "}</Typography>
          </Stack>
        </Stack>

        <DateCalendar
          value={month}
          onChange={() => { }}
          onMonthChange={handleMonthChange}
          reduceAnimations
          disableHighlightToday={false}
          sx={{
            width: "100%", // ⬅️ neka zauzme širinu kartice
            // malo veći header i tasteri
            "& .MuiPickersCalendarHeader-label": { fontSize: "1.05rem" },
            "& .MuiPickersArrowSwitcher-button": { p: 1.25 },
            // malo razmaka između nedelja
            "& .MuiDayCalendar-weekContainer": { mb: 0.75 },
          }}
          slots={{
            day: (p) => (
              <DayRenderer
                {...p}
                onSelectToggle={(ymd, e) => onDayClick(ymd, e)}
                meta={meta}
              />
            ),
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Chip size="small" color="error" label="Нерадни дан" />
          <Chip size="small" color="primary" label="Има шаблон" variant="outlined" />
        </Stack>
      </CardContent>

      {/* Single-day dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Подешавање дана — {editDate}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TemplateSelect value={editTemplateId} onChange={setEditTemplateId} label="Шаблон звона" />
            <FormControlLabel
              control={<Checkbox checked={editHoliday} onChange={(e) => setEditHoliday(e.target.checked)} />}
              label="Нерадни дан"
            />
            <textarea
              placeholder="Напомена (опционо)"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              style={{
                width: "100%",
                minHeight: 80,
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--mui-palette-divider)",
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Откажи</Button>
          <Button onClick={saveEdit} variant="contained">Сачувај</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Card>
  );
}
