/**
 * File: AdminAnnouncements.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useState } from "react";
import {
    Box, Typography, Button, Stack, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    PushPin as PushIcon,
    ToggleOn as ActiveIcon,
    ToggleOff as InactiveIcon,
    Add as AddIcon,
} from "@mui/icons-material";
import api from "../../api/axiosInstance";
import dayjs from "dayjs";
import AnnouncementDialog from "./AnnouncementDialog";


export default function AdminAnnouncements() {
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState("all");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editData, setEditData] = useState(null);


    const load = async () => {
        try {
            const res = await api.get("/announcements", { params: { status } });
            setItems(res.data?.items || []);
        } catch (e) {
            console.error("Greška pri učitavanju obaveštenja", e);
        }
    };

    useEffect(() => { load(); }, [status]);

    const toggleActive = async (id, current) => {
        await api.patch(`/announcements/${id}/toggle`, { is_active: !current });
        load();
    };

    const deleteItem = async (id) => {
        if (window.confirm("Да ли сигурно желиш да обришеш обавештење?")) {
            await api.delete(`/announcements/${id}`);
            load();
        }
    };

    const pushNow = async (id) => {
        await api.post(`/announcements/${id}/push`);
        alert("Обавештење је послато на огласну таблу.");
    };

    return (
        <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5">Обавештења</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditData(null); setDialogOpen(true); }}>
                    Ново
                </Button>

            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {["all", "active", "expired"].map((s) => (
                    <Button
                        key={s}
                        variant={s === status ? "contained" : "outlined"}
                        onClick={() => setStatus(s)}
                    >
                        {s === "all" ? "Сва" :
                            s === "active" ? "Активна" :
                                s === "scheduled" ? "На чекању" :
                                    "Истекла"}
                    </Button>
                ))}
            </Stack>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Наслов</TableCell>
                            <TableCell>Период</TableCell>
                            <TableCell>Приоритет</TableCell>
                            <TableCell>Активно</TableCell>
                            <TableCell align="right">Опције</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell>{a.title}</TableCell>
                                <TableCell>
                                    {dayjs(a.start_ts).format("DD.MM.YYYY HH:mm")} –<br />
                                    {dayjs(a.end_ts).format("DD.MM.YYYY HH:mm")}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={a.priority}
                                        color={
                                            a.priority === "URGENT" ? "error" :
                                                a.priority === "HIGH" ? "warning" : "info"
                                        }
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {a.is_active ? <Chip label="Да" color="success" size="small" /> : "Не"}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Измени">
                                        <IconButton onClick={() => { setEditData(a); setDialogOpen(true); }}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Активирај/деактивирај">
                                        <IconButton onClick={() => toggleActive(a.id, a.is_active)}>
                                            {a.is_active ? <ActiveIcon /> : <InactiveIcon />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Обриши">
                                        <IconButton onClick={() => deleteItem(a.id)}><DeleteIcon /></IconButton>
                                    </Tooltip>
                                    <Tooltip title="Прикажи одмах">
                                        <IconButton onClick={() => pushNow(a.id)}><PushIcon /></IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!items.length && (
                            <TableRow>
                                <TableCell colSpan={5}>Нема обавештења.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <AnnouncementDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                initialData={editData}
                onSaved={load}
            />

        </Box>
    );
}
