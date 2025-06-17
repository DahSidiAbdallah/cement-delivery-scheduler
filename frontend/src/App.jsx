import React, { useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';
import { SnackbarProvider, useSnackbar } from 'notistack';
import theme from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import ProductsPage from './components/ProductsPage';
import TrucksPage from './components/TrucksPage';
import OrdersPage from './components/OrdersPage';
import DeliveriesPage from './components/DeliveriesPage';
import SchedulePage from './components/SchedulePage';

// Wrapper component to provide auth context and notifications
const AppContent = () => {
  const token = localStorage.getItem('access_token');
  const { enqueueSnackbar } = useSnackbar();

  // Global notification handler
  const showNotification = useCallback((message, variant = 'info') => {
    enqueueSnackbar(message, {
      variant,
      anchorOrigin: {
        vertical: 'top',
        horizontal: 'center',
      },
      autoHideDuration: variant === 'error' ? 6000 : 3000,
    });
  }, [enqueueSnackbar]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LoginPage showNotification={showNotification} />} />
        <Route element={token ? <Layout /> : <Navigate to="/" replace />}>
          <Route path="/dashboard" element={<Dashboard showNotification={showNotification} />} />
          <Route path="/clients" element={<ClientsPage showNotification={showNotification} />} />
          <Route path="/products" element={<ProductsPage showNotification={showNotification} />} />
          <Route path="/trucks" element={<TrucksPage showNotification={showNotification} />} />
          <Route path="/orders" element={<OrdersPage showNotification={showNotification} />} />
          <Route path="/deliveries" element={<DeliveriesPage showNotification={showNotification} />} />
          <Route path="/schedule" element={<SchedulePage showNotification={showNotification} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          autoHideDuration={4000}
          preventDuplicate
        >
          <AppContent />
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
