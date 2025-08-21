/**
 * File: TemplateSelect.jsx
 * Path: /src/components/Admin/TemplateSelect.jsx
 * Author: Saša Kojadinović
 */

import { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import api from "../../api/axiosInstance";

/**
 * Селект за избор шаблона звона.
 * Приказује малу „swatch“ куглицу у боји шаблона (t.color).
 */
export default function TemplateSelect({
  value,
  onChange,
  label = "Шаблон звона",
  fullWidth = true,
  allowEmpty = true,
}) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/bell-templates");
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  return (
    <FormControl fullWidth={fullWidth} size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value || null)}
        displayEmpty
      >
        {allowEmpty && (
          <MenuItem value="">
            <em>— Без шаблона —</em>
          </MenuItem>
        )}
        {items.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: t.color || "#1976d2",
                  border: "1px solid rgba(0,0,0,0.2)",
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={t.name}
              secondary={t.description || ""}
              primaryTypographyProps={{ fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 12 }}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
