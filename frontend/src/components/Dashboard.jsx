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
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      minHeight: '100vh',
      overflowX: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 4,
        gap: 2
      }}>
        <Typography variant="h3" fontWeight={700} color="primary.main" sx={{ 
          fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
          display: 'flex',
          alignItems: 'center'
        }}>
          <DashboardIcon sx={{ mr: 1, fontSize: { xs: 32, sm: 40 } }} /> 
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Tableau de bord</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Accueil</Box>
        </Typography>
      </Box>
      <Divider sx={{ mb: 4 }} />
      <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} justifyContent="center">
        {pages.map(p => (
          <Grid item xs={6} sm={6} md={4} lg={3} key={p.to} sx={{ display: 'flex' }}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: 3, 
              transition: 'all 0.2s ease-in-out', 
              '&:hover': { 
                boxShadow: 8, 
                transform: 'translateY(-4px)' 
              },
              width: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardActionArea 
                component={Link} 
                to={p.to} 
                sx={{ 
                  p: { xs: 1.5, sm: 2, md: 3 }, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  flexGrow: 1,
                  justifyContent: 'center',
                  minHeight: 140
                }}
              >
                <Box sx={{ mb: 1 }}>{p.icon}</Box>
                <CardContent sx={{ p: 0, textAlign: 'center' }}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight={600}
                    sx={{ 
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      lineHeight: 1.2
                    }}
                  >
                    {p.label}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ 
        mt: { xs: 4, sm: 6 }, 
        p: 2, 
        textAlign: 'center', 
        background: '#e3eafc', 
        borderRadius: 2,
        mx: { xs: -2, sm: 0 },
        width: { xs: 'calc(100% + 32px)', sm: 'auto' }
      }} 
      elevation={0}
    >
        <Typography variant="body2" color="text.secondary">
          Planificateur de livraison de ciment &copy; {new Date().getFullYear()} &mdash; par MAFCI
        </Typography>
      </Paper>
    </Box>
  );
}
