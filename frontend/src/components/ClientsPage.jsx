// src/components/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, Snackbar
} from '@mui/material';
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
      <Typography variant="h4" gutterBottom>Clients</Typography>
      <Box sx={{ display: 'flex', mb: 2 }}>
        <TextField
          label="Client Name" 
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ flex: 1, mr: 2 }}
        />
        <Button variant="contained" onClick={handleAdd}>Add</Button>
      </Box>

      <Paper>
        <List>
          {clients.map(c => (
            <ListItem key={c.id}>{c.name}</ListItem>
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