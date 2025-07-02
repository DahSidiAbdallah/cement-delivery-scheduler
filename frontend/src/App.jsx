import React, { useCallback, useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';
import { SnackbarProvider, useSnackbar } from 'notistack';
import theme from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthContext } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import ProductsPage from './components/ProductsPage';
import TrucksPage from './components/TrucksPage';
import OrdersPage from './components/OrdersPage';
import DeliveriesPage from './components/DeliveriesPage';
import SchedulePage from './components/SchedulePage';
import UsersPage from './components/UsersPage';

// Wrapper component to provide auth context and notifications
const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  // Check authentication status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Verify the token is still valid
        await api.get('/auth/verify-token');
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

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

  // Update authentication state
  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);
  
  // Check if user has access to a route based on their role
  const hasAccess = useCallback((requiredRole) => {
    const userRole = localStorage.getItem('role') || 'viewer';
    
    // Admin has access to everything
    if (userRole === 'admin') return true;
    
    // Expedition role only has access to schedule page
    if (userRole === 'expedition') {
      return requiredRole === 'schedule';
    }
    
    // Viewer has access to orders, deliveries, and schedule
    if (userRole === 'viewer') {
      return ['orders', 'deliveries', 'schedule'].includes(requiredRole);
    }
    
    // Default deny
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ 
        isAuthenticated, 
        onLogin: handleLogin, 
        onLogout: handleLogout, 
        role: localStorage.getItem('role') || 'viewer' 
      }}>
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage 
                  showNotification={showNotification} 
                  onLoginSuccess={handleLogin} 
                />
              )
            } 
          />
          <Route element={isAuthenticated ? <Layout onLogout={handleLogout} /> : <Navigate to="/" replace />}>
            {/* Admin-only routes */}
            <Route 
              path="/dashboard" 
              element={
                localStorage.getItem('role') === 'admin' ? 
                <Dashboard showNotification={showNotification} /> : 
                <Navigate to="/orders" replace />
              } 
            />
            <Route 
              path="/clients" 
              element={
                localStorage.getItem('role') === 'admin' ? 
                <ClientsPage showNotification={showNotification} /> : 
                <Navigate to="/orders" replace />
              } 
            />
            <Route 
              path="/products" 
              element={
                localStorage.getItem('role') === 'admin' ? 
                <ProductsPage showNotification={showNotification} /> : 
                <Navigate to="/orders" replace />
              } 
            />
            <Route 
              path="/trucks" 
              element={
                localStorage.getItem('role') === 'admin' ? 
                <TrucksPage showNotification={showNotification} /> : 
                <Navigate to="/orders" replace />
              } 
            />
            <Route 
              path="/users" 
              element={
                localStorage.getItem('role') === 'admin' ? 
                <UsersPage showNotification={showNotification} /> : 
                <Navigate to="/orders" replace />
              } 
            />
            
            {/* Protected routes based on role */}
            <Route 
              path="/orders" 
              element={
                hasAccess('orders') ? 
                <OrdersPage showNotification={showNotification} /> : 
                <Navigate to="/schedule" replace />
              } 
            />
            <Route 
              path="/deliveries" 
              element={
                hasAccess('deliveries') ? 
                <DeliveriesPage showNotification={showNotification} /> : 
                <Navigate to="/schedule" replace />
              } 
            />
            <Route 
              path="/schedule" 
              element={
                hasAccess('schedule') ? 
                <SchedulePage showNotification={showNotification} autoRefresh={localStorage.getItem('role') === 'viewer'} /> : 
                <Navigate to="/" replace />
              } 
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthContext.Provider>
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
