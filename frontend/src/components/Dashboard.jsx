// src/components/Dashboard.jsx
import React from 'react';
import { Box, Typography, Grid, Card, CardActionArea, CardContent, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/');
  };

  const pages = [
    { label: 'Clients',    to: '/clients' },
    { label: 'Products',   to: '/products' },
    { label: 'Trucks',     to: '/trucks' },
    { label: 'Orders',     to: '/orders' },
    { label: 'Deliveries', to: '/deliveries' },
  ];

  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:4 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button color="error" onClick={logout}>Logout</Button>
      </Box>
      <Grid container spacing={2}>
        {pages.map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.to}>
            <Card>
              <CardActionArea component={Link} to={p.to}>
                <CardContent>
                  <Typography variant="h6" align="center">
                    {p.label}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
