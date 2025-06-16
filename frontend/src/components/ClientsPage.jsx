// src/components/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, Snackbar
} from '@mui/material';
import api from '../services/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [name, setName]       = useState('');
  const [snackbar, setSnackbar] = useState(null);

  const load = () => api.get('/clients').then(r => setClients(r.data));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    try {
      await api.post('/clients', { name, priority_level:1 });
      setName('');
      load();
      setSnackbar({ message: 'Client added', severity:'success' });
    } catch {
      setSnackbar({ message: 'Error adding client', severity:'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Clients</Typography>
      <Box sx={{ display:'flex', mb:2 }}>
        <TextField
          label="Client Name" value={name}
          onChange={e=>setName(e.target.value)}
          sx={{ flex:1, mr:2 }}
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
        onClose={()=>setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
      />
    </Box>
  );
}
