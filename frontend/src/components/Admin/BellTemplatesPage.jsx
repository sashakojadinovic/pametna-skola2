/**
 * File: BellTemplatesPage.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import bellApi from "../../api/bellApi";
import BellTemplateDialog from "./BellTemplateDialog";
import ColorDot from "./ColorDot";

function parseSpec(json_spec) {
  try {
    const spec = typeof json_spec === "string" ? JSON.parse(json_spec) : json_spec;
    return Array.isArray(spec?.rings) ? spec.rings : [];
  } catch {
    return [];
  }
}

export default function BellTemplatesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  async function load() {
    setLoading(true);
    try {
      const data = await bellApi.getTemplates();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setToast({ open: true, message: "Грешка при учитавању.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const table = useMemo(() => {
    return rows.map((r) => {
      const rings = parseSpec(r.json_spec);
      return {
        id: r.id,
        name: r.name,
        description: r.description || "",
        color: r.color || "#1976d2",
        ringsCount: rings.length,
        updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString("sr-RS") : "—",
        raw: r,
      };
    });
  }, [rows]);

  const handleNew = () => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const handleEdit = (row) => {
    setEditRow(row.raw);
    setDialogOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Обриши шаблон „${row.name}”?`)) return;
    try {
      await bellApi.deleteTemplate(row.id);
      setToast({ open: true, message: "Шаблон је обрисан.", severity: "success" });
      load();
    } catch {
      setToast({ open: true, message: "Брисање није успело.", severity: "error" });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Шаблони звона</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
          Нови шаблон
        </Button>
      </Stack>

      <Card>
        <CardContent>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Назив</TableCell>
                  <TableCell>Опис</TableCell>
                  <TableCell align="right"># звона</TableCell>
                  <TableCell>Измењен</TableCell>
                  <TableCell align="right">Акције</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {table.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {/* kvadratić boje ispred naziva */}
                        <ColorDot color={r.color} size={14} style={{ borderRadius: 4 }} />
                        <span>{r.name}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell align="right">{r.ringsCount}</TableCell>
                    <TableCell>{r.updated_at}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Уреди">
                        <IconButton onClick={() => handleEdit(r)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Обриши">
                        <IconButton onClick={() => handleDelete(r)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {table.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Нема шаблона. Кликни „Нови шаблон”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BellTemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editRow}
        onSaved={() => {
          setDialogOpen(false);
          setToast({ open: true, message: "Сачувано.", severity: "success" });
          load();
        }}
        onError={(msg) => setToast({ open: true, message: msg || "Грешка.", severity: "error" })}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
