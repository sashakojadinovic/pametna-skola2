/**
 * File: TemplateSelect.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

import { useEffect, useMemo, useState } from "react";
import { Autocomplete, TextField, CircularProgress, Box } from "@mui/material";
import bellApi from "../../api/bellApi";
import ColorDot from "./ColorDot";

export default function TemplateSelect({ value, onChange, label = "Шаблон" }) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await bellApi.getTemplates();
        if (mounted) setTemplates(Array.isArray(data) ? data : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selected = useMemo(
    () => templates.find((t) => t.id === value) || null,
    [templates, value]
  );
  console.log(templates);
  return (
    <Autocomplete
      options={templates}
      getOptionLabel={(o) => o?.name || ""}
      value={selected}
      onChange={(_, opt) => onChange?.(opt ? opt.id : null)}
      loading={loading}
      renderInput={(params) => (
        <TextField
        variant="standard"
        sx={{mb:1}}
          {...params}
          label={label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <ColorDot color={option.color || "#1976d2"} />
          {option.name}
        </Box>
      )}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
    />
  );
}
