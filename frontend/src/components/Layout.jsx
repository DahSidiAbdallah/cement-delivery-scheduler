// src/components/Layout.jsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  Divider,
  Paper
} from '@mui/material';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MAFCILogo from '../assets/MAFCI.png';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/');
  };

  const navItems = [
    { label: 'Tableau de bord',   to: '/dashboard',   icon: <DashboardIcon color="primary" /> },
    { label: 'Clients',     to: '/clients',     icon: <PeopleIcon color="primary" /> },
    { label: 'Produits',    to: '/products',    icon: <Inventory2Icon color="secondary" /> },
    { label: 'Camions',      to: '/trucks',      icon: <LocalShippingIcon color="success" /> },
    { label: 'Commandes',      to: '/orders',      icon: <AssignmentIcon color="warning" /> },
    { label: 'Livraisons',  to: '/deliveries',  icon: <LocalMallIcon color="info" /> },
    { label: 'Calendrier',    to: '/schedule',    icon: <CalendarMonthIcon color="error" /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Top App Bar */}
      <AppBar position="fixed" color="default" elevation={2} sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            <img src={MAFCILogo} alt="MAFCI Logo" style={{ height: 50, marginRight: 12, verticalAlign: 'middle' }} />
           
          </Typography>
          <Button color="error" variant="contained" onClick={logout} sx={{ fontWeight: 600 }}>
            Déconnexion
          </Button>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 220,
            boxSizing: 'border-box',
            top: 64,
            background: 'linear-gradient(180deg, #e3eafc 0%, #f5f7fa 100%)',
            borderRight: '1px solid #e0e0e0',
          },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={location.pathname === item.to}
              sx={{
                py: 2,
                borderRadius: 2,
                mb: 1,
                mx: 1,
                background: location.pathname === item.to ? '#e3eafc' : 'transparent',
                '&:hover': { background: '#e3eafc' },
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {item.icon}
              <Typography fontWeight={600}>{item.label}</Typography>
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          mt: 8,
          ml: '220px',
          minHeight: '100vh',
          background: 'transparent',
        }}
      >
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, minHeight: '80vh', background: '#fff' }}>
          <Outlet />
        </Paper>
      </Box>
    </Box>
  );
}
