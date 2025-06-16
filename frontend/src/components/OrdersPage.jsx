// src/components/OrdersPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, MenuItem, Select,
  Snackbar
} from '@mui/material';
import api from '../services/api';

export default function OrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [clients, setClients]   = useState([]);
  const [products, setProducts] = useState([]);

  const [clientId, setClientId]   = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity]   = useState('');
  const [date, setDate]           = useState('');
  const [time, setTime]           = useState('');
  const [snackbar, setSnackbar]   = useState(null);

  const load = () => api.get('/orders').then(r => setOrders(r.data));
  const loadClients  = () => api.get('/clients').then(r => setClients(r.data));
  const loadProducts = () => api.get('/products').then(r => setProducts(r.data));

  useEffect(() => {
    load(); loadClients(); loadProducts();
  }, []);

  const handleAdd = async () => {
    try {
      await api.post('/orders', {
        client_id: clientId,
        product_id: productId,
        quantity,
        requested_date: date,
        requested_time: time
      });
      setQuantity(''); setDate(''); setTime('');
      load();
      setSnackbar({ message:'Order added', severity:'success' });
    } catch {
      setSnackbar({ message:'Error adding order', severity:'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Orders</Typography>
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mb:2 }}>
        <Select
          value={clientId} onChange={e=>setClientId(e.target.value)}
          displayEmpty sx={{ minWidth:150 }}
        >
          <MenuItem value="">-- Client --</MenuItem>
          {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </Select>
        <Select
          value={productId} onChange={e=>setProductId(e.target.value)}
          displayEmpty sx={{ minWidth:150 }}
        >
          <MenuItem value="">-- Product --</MenuItem>
          {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </Select>
        <TextField
          label="Quantity (t)" type="number"
          value={quantity} onChange={e=>setQuantity(e.target.value)}
          sx={{ width:120 }}
        />
        <TextField
          label="Date" type="date"
          value={date} onChange={e=>setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Time" type="time"
          value={time} onChange={e=>setTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={handleAdd}>Add Order</Button>
      </Box>

      <Paper>
        <List>
          {orders.map(o => (
            <ListItem key={o.id}>
              {o.client_id} → {o.product_id}: {o.quantity}t @ {o.requested_date}
              {o.requested_time && ` ${o.requested_time}`}
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
