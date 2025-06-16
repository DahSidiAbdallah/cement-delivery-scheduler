// src/components/TrucksPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, Snackbar
} from '@mui/material';
import api from '../services/api';

export default function TrucksPage() {
  const [trucks, setTrucks]     = useState([]);
  const [plate, setPlate]       = useState('');
  const [capacity, setCapacity] = useState('');
  const [driver, setDriver]     = useState('');
  const [snackbar, setSnackbar] = useState(null);

  const load = () => api.get('/trucks').then(r => setTrucks(r.data));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    try {
      await api.post('/trucks', {
        plate_number: plate,
        capacity,
        driver_name: driver
      });
      setPlate(''); setCapacity(''); setDriver('');
      load();
      setSnackbar({ message:'Camion ajouté', severity:'success' });
    } catch {
      setSnackbar({ message:'Erreur lors de l\'ajout du camion', severity:'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Camions</Typography>
      <Box sx={{ display:'flex', mb:2 }}>
        <TextField label="Immatriculation" value={plate}
          onChange={e=>setPlate(e.target.value)} sx={{ mr:2 }} />
        <TextField label="Capacité" value={capacity}
          type="number" onChange={e=>setCapacity(e.target.value)} sx={{ mr:2 }} />
        <TextField label="Chauffeur" value={driver}
          onChange={e=>setDriver(e.target.value)} sx={{ mr:2 }} />
        <Button variant="contained" onClick={handleAdd}>Ajouter</Button>
      </Box>

      <Paper>
        <List>
          {trucks.map(t => (
            <ListItem key={t.id}>
              {t.plate_number} — {t.capacity}t — {t.driver_name}
            </ListItem>
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
