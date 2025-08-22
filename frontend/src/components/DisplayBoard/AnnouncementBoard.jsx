/**
 * File: AnnouncementBoard.jsx
 * Path: /frontend/src/components/DisplayBoard
 * Author: Saša Kojadinović
 */

import { Alert, Box, Card, CardContent, Typography, Stack } from "@mui/material";
import DOMPurify from "dompurify";

const priorityColor = {
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "error",
};

export default function AnnouncementBoard({ items = [], override = null }) {
  if (!items.length && !override) return null;

  return (
    <Box sx={{ mb: 3 }}>
      {override && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Хитно обавештење:</strong> {override.title}
        </Alert>
      )}

      {items.map((a) => (
        <Card
          key={a.id}
          sx={{
            mb: 2,
            borderLeft: `6px solid`,
            borderColor: `${priorityColor[a.priority] || "info"}.main`,
          }}
        >
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6" gutterBottom>
                {a.title}
              </Typography>
              {a.body && (
                <Typography
                  variant="body2"
                  component="div"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(a.body),
                  }}
                />
              )}
             {/*  <Typography variant="caption" color="text.secondary">
                Важи: {new Date(a.start_ts).toLocaleString("sr-RS")} –{" "}
                {new Date(a.end_ts).toLocaleString("sr-RS")}
              </Typography> */}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
