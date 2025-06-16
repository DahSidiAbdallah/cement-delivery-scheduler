// src/components/Dashboard.jsx
import React from 'react';
import { Box, Typography, Grid, Card, CardActionArea, CardContent, Button, Divider, Paper } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export default function Dashboard() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/');
  };

  const pages = [
    { label: 'Clients',    to: '/clients',    icon: <PeopleIcon fontSize="large" color="primary" /> },
    { label: 'Products',   to: '/products',   icon: <Inventory2Icon fontSize="large" color="secondary" /> },
    { label: 'Trucks',     to: '/trucks',     icon: <LocalShippingIcon fontSize="large" color="success" /> },
    { label: 'Orders',     to: '/orders',     icon: <AssignmentIcon fontSize="large" color="warning" /> },
    { label: 'Deliveries', to: '/deliveries', icon: <LocalMallIcon fontSize="large" color="info" /> },
    { label: 'Schedule',   to: '/schedule',   icon: <CalendarMonthIcon fontSize="large" color="error" /> },
  ];

  return (
    <Box sx={{ p: 4, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:4 }}>
        <Typography variant="h3" fontWeight={700} color="primary.main">
          <DashboardIcon sx={{ mr: 1, fontSize: 40 }} /> Dashboard
        </Typography>
        <Button color="error" variant="contained" onClick={logout} sx={{ fontWeight: 600 }}>
          Logout
        </Button>
      </Box>
      <Divider sx={{ mb: 4 }} />
      <Grid container spacing={4} justifyContent="center">
        {pages.map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.to}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, transition: '0.2s', '&:hover': { boxShadow: 8, transform: 'scale(1.03)' } }}>
              <CardActionArea component={Link} to={p.to} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {p.icon}
                <CardContent>
                  <Typography variant="h6" align="center" fontWeight={600}>
                    {p.label}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ mt: 6, p: 2, textAlign: 'center', background: '#e3eafc', borderRadius: 2 }} elevation={0}>
        <Typography variant="body2" color="text.secondary">
          Cement Delivery Scheduler &copy; {new Date().getFullYear()} &mdash; Powered by MAFCI
        </Typography>
      </Paper>
    </Box>
  );
}
