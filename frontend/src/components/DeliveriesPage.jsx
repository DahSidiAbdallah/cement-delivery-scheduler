// src/components/DeliveriesPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper, Typography,
  MenuItem, Select, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [clients, setClients] = useState([]);

  const [orderId, setOrderId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({
    order_id: '', truck_id: '', scheduled_date: '', scheduled_time: '', status: ''
  });

  // Fetch all data
  const load = () => api.get('/deliveries').then(r => setDeliveries(r.data));
  const loadOrders = () => api.get('/orders').then(r => setOrders(r.data));
  const loadTrucks = () => api.get('/trucks').then(r => setTrucks(r.data));
  const loadClients = () => api.get('/clients').then(r => setClients(r.data));
  useEffect(() => { load(); loadOrders(); loadTrucks(); loadClients(); }, []);

  // Add delivery
  const handleAdd = async () => {
    if (!orderId || !truckId || !date) {
      setSnackbar({ message: 'Tous les champs obligatoires doivent être remplis', severity: 'error' });
      return;
    }
    try {
      await api.post('/deliveries', {
        order_id: orderId,
        truck_id: truckId,
        scheduled_date: date,
        scheduled_time: time || undefined
      });
      setDate(''); setTime('');
      load();
      setSnackbar({ message: 'Livraison ajoutée', severity: 'success' });
    } catch {
      setSnackbar({ message: 'Erreur lors de l\'ajout de la livraison', severity: 'error' });
    }
  };

  // Delete delivery
  const handleDelete = async (id) => {
    try {
      await api.delete(`/deliveries/${id}`);
      setSnackbar({ message: 'Livraison supprimée', severity: 'success' });
      setDeleteId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  // Open edit dialog
  const handleEditOpen = (delivery) => {
    setEditId(delivery.id);
    setEditData({
      order_id: delivery.order_id,
      truck_id: delivery.truck_id,
      scheduled_date: delivery.scheduled_date,
      scheduled_time: delivery.scheduled_time || '',
      status: delivery.status || ''
    });
  };

  // Save edit
  const handleEditSave = async () => {
    if (!editData.order_id || !editData.truck_id || !editData.scheduled_date) {
      setSnackbar({ message: 'Tous les champs obligatoires doivent être remplis', severity: 'error' });
      return;
    }
    const payload = {
      ...editData,
      scheduled_date: editData.scheduled_date || undefined,
      scheduled_time: editData.scheduled_time || undefined,
      status: editData.status || undefined,
    };
    try {
      await api.put(`/deliveries/${editId}`, payload);
      setSnackbar({ message: 'Livraison modifiée', severity: 'success' });
      setEditId(null);
      load();
    } catch (err) {
      setSnackbar({ message: "Erreur lors de la modification", severity: "error" });
      console.error("Erreur lors de la modification:", err, err?.response?.data);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Livraisons</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Select
          value={orderId} onChange={e => setOrderId(e.target.value)}
          displayEmpty sx={{ minWidth: 180 }}
        >
          <MenuItem value="">-- Commande --</MenuItem>
          {orders.map(o => {
            const client = clients.find(c => c.id === o.client_id);
            return (
              <MenuItem key={o.id} value={o.id}>
                {client ? `${client.name} (${o.quantity}t, ${o.requested_date})` : o.id}
              </MenuItem>
            );
          })}
        </Select>
        <Select
          value={truckId} onChange={e => setTruckId(e.target.value)}
          displayEmpty sx={{ minWidth: 160 }}
        >
          <MenuItem value="">-- Camion --</MenuItem>
          {trucks.map(t => (
            <MenuItem key={t.id} value={t.id}>{t.plate_number}</MenuItem>
          ))}
        </Select>
        <TextField
          label="Date" type="date"
          value={date} onChange={e => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 140 }}
        />
        <TextField
          label="Heure" type="time"
          value={time} onChange={e => setTime(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
        />
        <Button variant="contained" onClick={handleAdd}>Ajouter la livraison</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Commande</TableCell>
                <TableCell>Camion</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Heure</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell>
                    {
                      (() => {
                        const order = orders.find(o => o.id === d.order_id);
                        const client = clients.find(c => c.id === order?.client_id);
                        return order && client
                          ? `${client.name} (${order.quantity}t, ${order.requested_date})`
                          : d.order_id;
                      })()
                    }
                  </TableCell>
                  <TableCell>
                    {trucks.find(t => t.id === d.truck_id)?.plate_number || d.truck_id}
                  </TableCell>
                  <TableCell>
                    {d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {d.scheduled_time ? d.scheduled_time.slice(0, 5) : '-'}
                  </TableCell>
                  <TableCell>{d.status || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" size="small" onClick={() => handleEditOpen(d)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => setDeleteId(d.id)}>
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
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Supprimer la livraison ?</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer cette livraison ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" onClick={() => handleDelete(deleteId)}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editId} onClose={() => setEditId(null)}>
        <DialogTitle>Modifier la livraison</DialogTitle>
        <DialogContent>
          <Select
            label="Commande"
            value={editData.order_id}
            onChange={e => setEditData({ ...editData, order_id: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          >
            {orders.map(o => {
              const client = clients.find(c => c.id === o.client_id);
              return (
                <MenuItem key={o.id} value={o.id}>
                  {client ? `${client.name} (${o.quantity}t, ${o.requested_date})` : o.id}
                </MenuItem>
              );
            })}
          </Select>
          <Select
            label="Camion"
            value={editData.truck_id}
            onChange={e => setEditData({ ...editData, truck_id: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          >
            {trucks.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.plate_number}</MenuItem>
            ))}
          </Select>
          <TextField
            label="Date"
            type="date"
            value={editData.scheduled_date}
            onChange={e => setEditData({ ...editData, scheduled_date: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Heure"
            type="time"
            value={editData.scheduled_time}
            onChange={e => setEditData({ ...editData, scheduled_time: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Statut"
            value={editData.status}
            onChange={e => setEditData({ ...editData, status: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Annuler</Button>
          <Button onClick={handleEditSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
