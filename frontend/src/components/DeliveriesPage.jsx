// src/components/DeliveriesPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, MenuItem, Select,
  Snackbar
} from '@mui/material';
import api from '../services/api';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders]         = useState([]);
  const [trucks, setTrucks]         = useState([]);

  const [orderId, setOrderId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('');
  const [snackbar, setSnackbar] = useState(null);

  const load = () => api.get('/deliveries').then(r => setDeliveries(r.data));
  const loadOrders = () => api.get('/orders').then(r => setOrders(r.data));
  const loadTrucks = () => api.get('/trucks').then(r => setTrucks(r.data));

  useEffect(() => {
    load(); loadOrders(); loadTrucks();
  }, []);

  const handleAdd = async () => {
    try {
      await api.post('/deliveries', {
        order_id: orderId,
        truck_id: truckId,
        scheduled_date: date,
        scheduled_time: time
      });
      setDate(''); setTime('');
      load();
      setSnackbar({ message:'Livraison ajoutée', severity:'success' });
    } catch {
      setSnackbar({ message:'Erreur lors de l\'ajout de la livraison', severity:'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Livraisons</Typography>
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mb:2 }}>
        <Select
          value={orderId} onChange={e=>setOrderId(e.target.value)}
          displayEmpty sx={{ minWidth:150 }}
        >
          <MenuItem value="">-- Commande --</MenuItem>
          {orders.map(o => (
            <MenuItem key={o.id} value={o.id}>{o.id}</MenuItem>
          ))}
        </Select>
        <Select
          value={truckId} onChange={e=>setTruckId(e.target.value)}
          displayEmpty sx={{ minWidth:150 }}
        >
          <MenuItem value="">-- Camion --</MenuItem>
          {trucks.map(t => (
            <MenuItem key={t.id} value={t.id}>{t.plate_number}</MenuItem>
          ))}
        </Select>
        <TextField
          label="Date" type="date"
          value={date} onChange={e=>setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width:140 }}
        />
        <TextField
          label="Heure" type="time"
          value={time} onChange={e=>setTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width:120 }}
        />
        <Button variant="contained" onClick={handleAdd}>Ajouter la livraison</Button>
      </Box>

      <Paper>
        <List>
          {deliveries.map(d => (
            <ListItem key={d.id}>
              Cde:{d.order_id} Camion:{d.truck_id} @ {d.scheduled_date}
              {d.scheduled_time && ` ${d.scheduled_time}`}
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