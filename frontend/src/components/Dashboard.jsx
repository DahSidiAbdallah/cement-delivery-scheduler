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

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();

  const { role = localStorage.getItem('role') || 'viewer' } = useContext(AuthContext) || {};

  const pages = [
    { label: 'Clients',    to: '/clients',    icon: <PeopleIcon fontSize="large" color="primary" /> },
    { label: 'Produits',   to: '/products',   icon: <Inventory2Icon fontSize="large" color="secondary" /> },
    { label: 'Camions',     to: '/trucks',     icon: <LocalShippingIcon fontSize="large" color="success" /> },
    { label: 'Commandes',     to: '/orders',     icon: <AssignmentIcon fontSize="large" color="warning" /> },
    { label: 'Livraisons', to: '/deliveries', icon: <LocalMallIcon fontSize="large" color="info" /> },
    { label: 'Calendrier',   to: '/schedule',   icon: <CalendarMonthIcon fontSize="large" color="error" /> },
  ];

  if (role === 'admin') {
    pages.push({ label: 'Gestion des utilisateurs', to: '/users', icon: <PeopleIcon fontSize="large" color="action" /> });
  }

  return (
    <Box sx={{ p: 4, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:4 }}>
        <Typography variant="h3" fontWeight={700} color="primary.main">
          <DashboardIcon sx={{ mr: 1, fontSize: 40 }} /> Tableau de bord
        </Typography>
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
          Planificateur de livraison de ciment &copy; {new Date().getFullYear()} &mdash;  par MAFCI
        </Typography>
      </Paper>
    </Box>
  );
}
