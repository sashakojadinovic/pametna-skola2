/**
 * File: PlaylistTracksDialog.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, IconButton, Tooltip, Table, TableBody,
  TableCell, TableRow, TableHead, Typography
} from "@mui/material";
import { Add, Delete, Save } from "@mui/icons-material";
import { useEffect, useState } from "react";
import api from "../../api/axiosInstance";

export default function PlaylistTracksDialog({ open, onClose, playlist }) {
  const [tracks, setTracks] = useState([]);
  const [newTrack, setNewTrack] = useState({ title: "", artist: "", file_path: "" });

  const loadTracks = async () => {
    const res = await api.get(`/playlists/${playlist.id}/tracks`);
    setTracks(res.data || []);
  };

  useEffect(() => {
    if (open) loadTracks();
  }, [open]);

  const addTrack = async () => {
    const payload = { ...newTrack, duration_s: 0, order_index: tracks.length };
    await api.post(`/playlists/${playlist.id}/tracks`, payload);
    setNewTrack({ title: "", artist: "", file_path: "" });
    loadTracks();
  };

  const deleteTrack = async (trackId) => {
    await api.delete(`/playlists/${playlist.id}/tracks/${trackId}`);
    loadTracks();
  };

  const updateTrack = async (track) => {
    await api.put(`/playlists/${playlist.id}/tracks/${track.id}`, track);
    loadTracks();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload/track", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewTrack((prev) => ({ ...prev, file_path: res.data.file_path }));
    } catch (err) {
      alert("Грешка при уплоуду.");
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>🎵 Песме у плејлисти: {playlist.name}</DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>🎵 Назив</TableCell>
              <TableCell>🎤 Извођач</TableCell>
              <TableCell>📂 Путања</TableCell>
              <TableCell>🎚️ Акције</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracks.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <TextField
                    value={t.title}
                    onChange={(e) =>
                      setTracks((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x))
                      )
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={t.artist}
                    onChange={(e) =>
                      setTracks((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, artist: e.target.value } : x))
                      )
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {t.file_path}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Сачувај">
                    <IconButton onClick={() => updateTrack(t)}>
                      <Save />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Обриши">
                    <IconButton onClick={() => deleteTrack(t.id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {/* Novi unos */}
            <TableRow>
              <TableCell>
                <TextField
                  placeholder="Наслов"
                  value={newTrack.title}
                  onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <TextField
                  placeholder="Извођач"
                  value={newTrack.artist}
                  onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  style={{ marginTop: 4 }}
                />
                {newTrack.file_path && (
                  <Typography variant="caption" color="text.secondary">
                    {newTrack.file_path}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Tooltip title="Додај песму">
                  <IconButton onClick={addTrack}>
                    <Add />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Затвори</Button>
      </DialogActions>
    </Dialog>
  );
}
