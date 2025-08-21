/**
 * File: main.jsx
 * Path: /frontend/src
 * Author: Saša Kojadinović
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/sr";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="sr">
      <App />
    </LocalizationProvider>
  </React.StrictMode>
);
