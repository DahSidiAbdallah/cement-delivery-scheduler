// src/components/OrdersPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, MenuItem, Select,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ client_id: '', product_id: '', quantity: '', requested_date: '', requested_time: '' });

  const load = () => api.get('/orders').then(r => setOrders(r.data));
  const loadClients  = () => api.get('/clients').then(r => setClients(r.data));
  const loadProducts = () => api.get('/products').then(r => setProducts(r.data));

  useEffect(() => {
    load(); loadClients(); loadProducts();
  }, []);

  const handleAdd = async () => {
    console.log("requested_time to send:", time);
    if (!clientId || !productId || !quantity || !date) {
      setSnackbar({ message: 'Tous les champs obligatoires doivent être remplis', severity: 'error' });
      return;
    }
    // Convert quantity to float and time to HH:MM:SS or null
    const parsedQuantity = parseFloat(quantity);
    let parsedTime = time;
    if (parsedTime && parsedTime.length === 5) parsedTime += ':00';
    if (!parsedTime) parsedTime = null;
    console.log('Order add payload:', {
      client_id: clientId,
      product_id: productId,
      quantity: parsedQuantity,
      requested_date: date,
      requested_time: parsedTime
    });
    try {
      await api.post('/orders', {
        client_id: clientId,
        product_id: productId,
        quantity: parsedQuantity,
        requested_date: date,
        requested_time: time ? time : undefined // will not send if blank
      });
      setQuantity(''); setDate(''); setTime('');
      load();
      setSnackbar({ message:'Commande ajoutée', severity:'success' });
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la commande:', err, err?.response?.data);
      let msg = 'Erreur lors de l\'ajout de la commande';
      if (err?.response?.data?.error) msg += ': ' + err.response.data.error;
      if (err?.response?.data?.details) msg += ' (' + err.response.data.details + ')';
      setSnackbar({ message: msg, severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/orders/${id}`);
      setSnackbar({ message: 'Commande supprimée', severity: 'success' });
      setDeleteId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleEditOpen = (order) => {
    setEditId(order.id);
    setEditData({
      client_id: order.client_id,
      product_id: order.product_id,
      quantity: order.quantity,
      requested_date: order.requested_date,
      requested_time: order.requested_time || ''
    });
  };

  const handleEditSave = async () => {
    console.log("requested_time to send (edit):", editData.requested_time);
    if (!editData.client_id || !editData.product_id || !editData.quantity || !editData.requested_date) {
      setSnackbar({ message: 'Tous les champs obligatoires doivent être remplis', severity: 'error' });
      return;
    }
    // Convert quantity to float and time to HH:MM:SS or null
    const parsedQuantity = parseFloat(editData.quantity);
    let parsedTime = editData.requested_time;
    if (parsedTime && parsedTime.length === 5) parsedTime += ':00';
    if (!parsedTime) parsedTime = null;
    console.log('Order edit payload:', { ...editData, quantity: parsedQuantity, requested_time: parsedTime });
    try {
      await api.put(`/orders/${editId}`, {
        ...editData,
        quantity: parsedQuantity,
        requested_time: editData.requested_time ? editData.requested_time : undefined
      });
      setSnackbar({ message: 'Commande modifiée', severity: 'success' });
      setEditId(null);
      load();
    } catch (err) {
      console.error('Erreur lors de la modification de la commande:', err, err?.response?.data);
      let msg = 'Erreur lors de la modification de la commande';
      if (err?.response?.data?.error) msg += ': ' + err.response.data.error;
      if (err?.response?.data?.details) msg += ' (' + err.response.data.details + ')';
      setSnackbar({ message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Commandes</Typography>
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
          <MenuItem value="">-- Produit --</MenuItem>
          {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}{p.type ? ` (${p.type})` : ''}</MenuItem>)}
        </Select>
        <TextField
          label="Quantité (t)" type="number"
          value={quantity} onChange={e=>setQuantity(e.target.value)}
          sx={{ width:120 }}
          inputProps={{ min: 0, step: 0.01 }}
        />
        <TextField
          label="Date" type="date"
          value={date} onChange={e=>setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Heure" type="time"
          value={time} onChange={e=>setTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={handleAdd}>Ajouter la commande</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell>Quantité</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Heure</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>
  {clients.find(c => c.id === o.client_id)?.name || o.client_id}
</TableCell>
<TableCell>
  {(() => {
    const product = products.find(p => p.id === o.product_id);
    return product ? `${product.name}${product.type ? ` (${product.type})` : ''}` : o.product_id;
  })()}
</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>{o.requested_date}</TableCell>
                  <TableCell>{o.requested_time || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" size="small" onClick={() => handleEditOpen(o)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => setDeleteId(o.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={()=>setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
      />
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Supprimer la commande ?</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer cette commande ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" onClick={() => handleDelete(deleteId)}>Supprimer</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editId} onClose={() => setEditId(null)}>
        <DialogTitle>Modifier la commande</DialogTitle>
        <DialogContent>
          <TextField label="Client ID" value={editData.client_id} onChange={e=>setEditData({...editData, client_id:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Produit ID" value={editData.product_id} onChange={e=>setEditData({...editData, product_id:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Quantité" type="number" value={editData.quantity} onChange={e=>setEditData({...editData, quantity:e.target.value})} fullWidth sx={{mb:2}} inputProps={{ min: 0, step: 0.01 }} />
          <TextField label="Date" type="date" value={editData.requested_date} onChange={e=>setEditData({...editData, requested_date:e.target.value})} fullWidth sx={{mb:2}} InputLabelProps={{ shrink: true }} />
          <TextField label="Heure" type="time" value={editData.requested_time} onChange={e=>setEditData({...editData, requested_time:e.target.value})} fullWidth InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Annuler</Button>
          <Button onClick={handleEditSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
    );
    }
