/**
 * File: AdminPage.jsx
 * Path: /src/pages
 * Author: Saša Kojadinović
 */

import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { Link } from "react-router-dom";
import BellTemplatesPage from "../components/Admin/BellTemplatesPage";
import DayScheduleCalendar from "../components/Admin/DayScheduleCalendar";
import AdminAnnouncements from "../components/Admin/AdminAnnouncements";
import AdminPlaylists from "../components/Admin/AdminPlaylists";

export default function AdminPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Шаблони" />
        <Tab label="Обавештења" />
        <Tab label="Музика" />
        <Tab label="Календар" />
        <Tab label="Огласни монитор" component={Link} to="/" />
      </Tabs>

      {tab === 0 && <BellTemplatesPage />}
      {tab === 1 && <AdminAnnouncements />}
      {tab === 2 && <AdminPlaylists />}
      {tab === 3 && <DayScheduleCalendar />}
    </Box>
  );
}

