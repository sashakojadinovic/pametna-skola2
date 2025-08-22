/**
 * File: muiTheme.js
 * Path: /frontend/src/theme
 * Author: Saša Kojadinović
 */
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: "light",
    // ✅ redefinisana primary paleta
    primary: {
      main: '#36383a',      // tamno siva
      light: '#676c70',     // svetlija siva
      dark: '#0e0e0e',      // skoro crna
      contrastText: '#fff', // bela slova na tamnoj pozadini
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "uppercase", 
        },
      },
    },
  },
});

export default theme;
