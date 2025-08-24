/**
 * File: RingNowButton.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useState } from "react";
import { Button, Snackbar, Alert } from "@mui/material";
import api from "../../api/axiosInstance";

export default function RingNowButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setSuccess(false);
    setError(false);
    try {
      await api.post("/bell/test-fire", { duration_ms: 2500 });
      setSuccess(true);
    } catch (err) {
      console.error("Грешка при звонирању:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color={success ? "success" : "primary"}
        onClick={handleClick}
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? "🔃 Звони..." : success ? "✅ Звук послат" : "🔔 Звони одмах"}
      </Button>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" sx={{ width: "100%" }}>
          Звук звона је послат.
        </Alert>
      </Snackbar>

      <Snackbar open={error} autoHideDuration={4000} onClose={() => setError(false)}>
        <Alert severity="error" sx={{ width: "100%" }}>
          Грешка при звонирању.
        </Alert>
      </Snackbar>
    </>
  );
}
