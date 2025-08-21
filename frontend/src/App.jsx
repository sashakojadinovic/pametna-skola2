/**
 * File: App.jsx
 * Path: /frontend/src
 * Author: Saša Kojadinović
 */
import { ThemeProvider, CssBaseline, Container, AppBar, Toolbar, Button } from '@mui/material'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import theme from './theme/muiTheme'
import MonitorPage from './pages/MonitorPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppBar position="static">
          <Toolbar>
            <Button color="inherit" component={Link} to="/">Огласни монитор</Button>
            <Button color="inherit" component={Link} to="/admin">Админ</Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<MonitorPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Container>
      </BrowserRouter>
    </ThemeProvider>
  )
}
