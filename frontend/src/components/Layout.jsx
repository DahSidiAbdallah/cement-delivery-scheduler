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
  ListItemButton
} from '@mui/material';
import { Link, Outlet, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/');
  };

  // Define your navigation items here
  const navItems = [
    { label: 'Dashboard',   to: '/dashboard' },
    { label: 'Clients',     to: '/clients' },
    { label: 'Products',    to: '/products' },
    { label: 'Trucks',      to: '/trucks' },
    { label: 'Orders',      to: '/orders' },
    { label: 'Deliveries',  to: '/deliveries' },
    { label: 'Schedule',    to: '/schedule' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top App Bar */}
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MAFCI 
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: 200,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: 200, 
            boxSizing: 'border-box',
            top: 64  /* height of AppBar */ 
          },
        }}
      >
        <Toolbar /> {/* spacer for AppBar */}
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
            >
              {item.label}
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,    /* margin-top to clear AppBar */
          ml: 200/8 /* margin-left to clear Drawer (200px / 8 = 25rem) */
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
