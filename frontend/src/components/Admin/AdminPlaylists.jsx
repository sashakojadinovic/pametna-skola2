/**
 * File: AdminPlaylists.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useState } from "react";
import {
  Box, Typography, Stack, Button, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import api from "../../api/axiosInstance";
import PlaylistTracksDialog from "./PlaylistTracksDialog";

export default function AdminPlaylists() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const [tracksOpen, setTracksOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const load = async () => {
    const res = await api.get("/playlists");
    setItems(res.data || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Да ли сигурно желиш да обришеш плејлисту?")) return;
    await api.delete(`/playlists/${id}`);
    load();
  };

  const handleSubmit = async () => {
    try {
      if (editData.id) {
        await api.put(`/playlists/${editData.id}`, editData);
      } else {
        await api.post("/playlists", editData);
      }
      setDialogOpen(false);
      setEditData(null);
      load();
    } catch (e) {
      alert("Грешка при чувању.");
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Плејлисте</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => { setEditData({ name: "", mode: "SHUFFLE", crossfade_s: 0, is_active: 1, is_default: 0 }); setDialogOpen(true); }}
        >
          Нова плејлиста
        </Button>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Назив</TableCell>
              <TableCell>Мод</TableCell>
              <TableCell>Активна</TableCell>
              <TableCell>Подразумевана</TableCell>
              <TableCell>Акције</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.mode}</TableCell>
                <TableCell>
                  <Chip label={p.is_active ? "Да" : "Не"} color={p.is_active ? "success" : "default"} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={p.is_default ? "Да" : "Не"} color={p.is_default ? "primary" : "default"} size="small" />
                </TableCell>
                <TableCell>
                  <Tooltip title="Измени">
                    <IconButton onClick={() => { setEditData(p); setDialogOpen(true); }}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="🎵 Песме">
                    <IconButton onClick={() => { setSelectedPlaylist(p); setTracksOpen(true); }}>
                      🎵
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Обриши">
                    <IconButton onClick={() => handleDelete(p.id)}><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Нема плејлиста.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editData?.id ? "Измени плејлисту" : "Нова плејлиста"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Назив"
              value={editData?.name || ""}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Режим пуштања"
              select
              value={editData?.mode || "SHUFFLE"}
              onChange={(e) => setEditData({ ...editData, mode: e.target.value })}
              fullWidth
            >
              <option value="SHUFFLE">Насумично</option>
              <option value="ORDERED">Редом</option>
            </TextField>
            <TextField
              label="Crossfade (секунде)"
              type="number"
              value={editData?.crossfade_s || 0}
              onChange={(e) => setEditData({ ...editData, crossfade_s: Number(e.target.value) })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!editData?.is_active}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.checked ? 1 : 0 })}
                />
              }
              label="Активна"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!editData?.is_default}
                  onChange={(e) => setEditData({ ...editData, is_default: e.target.checked ? 1 : 0 })}
                />
              }
              label="Подразумевана"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Откажи</Button>
          <Button variant="contained" onClick={handleSubmit}>Сачувај</Button>
        </DialogActions>
      </Dialog>
      {selectedPlaylist && (
        <PlaylistTracksDialog
          open={tracksOpen}
          onClose={() => setTracksOpen(false)}
          playlist={selectedPlaylist}
        />
      )}
    </Box>

  );
}
