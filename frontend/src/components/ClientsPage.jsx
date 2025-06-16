// src/components/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PeopleIcon from '@mui/icons-material/People';
import api from '../services/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState('');
  const [snackbar, setSnackbar] = useState(null);

  const load = async () => {
    try {
      console.log('🔄 Attempting to load clients...');
      const response = await api.get('/clients');
      console.log('✅ Clients loaded successfully:', response.data);
      setClients(response.data);
    } catch (error) {
      console.error('❌ Error loading clients:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.status === 401 
        ? 'Authentication failed - please log in again' 
        : `Error loading clients: ${error.response?.status || 'Network error'}`;
        
      setSnackbar({ message: errorMessage, severity: 'error' });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    console.log('Token check on mount:', token ? 'EXISTS' : 'MISSING');
    
    if (token) {
      load();
    } else {
      setSnackbar({ message: 'Please log in first', severity: 'error' });
    }
  }, []);

  const handleAdd = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setSnackbar({ message: 'Please log in first', severity: 'error' });
      return;
    }

    try {
      await api.post('/clients', { name, priority_level: 1 });
      setName('');
      load();
      setSnackbar({ message: 'Client added', severity: 'success' });
    } catch (error) {
      console.error('Error adding client:', error);
      setSnackbar({ message: 'Error adding client', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PeopleIcon color="primary" sx={{ fontSize: 36, mr: 1 }} />
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>Clients</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display:'flex', mb:2, gap:2 }}>
        <TextField
          label="Nom du client"
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ flex:1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonAddAlt1Icon color="action" />
              </InputAdornment>
            )
          }}
        />
        <Button variant="contained" color="primary" size="large" onClick={handleAdd} sx={{ fontWeight: 600, px: 4 }}>
          Ajouter
        </Button>
      </Box>
      <Paper sx={{ mt: 2, p: 2, borderRadius: 2, boxShadow: 1, background: '#f5f7fa' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          Liste des clients
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List>
          {clients.map(c => (
            <ListItem key={c.id} sx={{ py: 1, borderBottom: '1px solid #e0e0e0' }}>{c.name}</ListItem>
          ))}
        </List>
      </Paper>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}