// src/components/OrdersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, MenuItem, Select,
  Snackbar, Dialog, DialogTitle, DialogContent, 
  DialogActions, IconButton, CircularProgress, Alert,
  FormControl, InputLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';

const statusColors = {
  'Pending': 'warning',
  'annulée': 'error'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  
  // Form state
  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Dialog state
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const initialEditData = {
    client_id: '',
    product_id: '',
    quantity: '',
    requested_date: new Date().toISOString().split('T')[0], // Today's date as default
    requested_time: '',
    status: 'Pending'
  };
  const [editData, setEditData] = useState(initialEditData);

  const loadOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      setSnackbar({ message: 'Erreur lors du chargement des commandes', severity: 'error' });
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
      setSnackbar({ message: 'Erreur lors du chargement des clients', severity: 'error' });
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setSnackbar({ message: 'Erreur lors du chargement des produits', severity: 'error' });
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadOrders(),
        loadClients(),
        loadProducts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadOrders, loadClients, loadProducts]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleAdd = async () => {
    if (!clientId || !productId || !quantity || !date) {
      setSnackbar({ 
        message: 'Veuillez remplir tous les champs obligatoires', 
        severity: 'error' 
      });
      return;
    }
    
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setSnackbar({
        message: 'La quantité doit être un nombre positif',
        severity: 'error'
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Format the request payload
      const payload = {
        client_id: clientId,
        product_id: productId,
        quantity: parsedQuantity,
        requested_date: date,
      };
      
      // Only include time if it's provided and valid
      if (time && time.trim() !== '') {
        // Ensure time is in H:MM or HH:MM format and convert to HH:MM
        if (/^\d{1,2}:\d{2}$/.test(time)) {
          const [hours, minutes] = time.split(':');
          payload.requested_time = `${hours.padStart(2, '0')}:${minutes}`;
        } else {
          throw new Error('Format d\'heure invalide. Utilisez le format HH:MM');
        }
      } else {
        // Explicitly set to null if no time provided
        payload.requested_time = null;
      }
      
      console.log('Sending payload:', payload);
      
      await api.post('/orders', payload);
      
      // Reset form
      setClientId('');
      setProductId('');
      setQuantity('');
      setDate('');
      setTime('');
      
      // Refresh data
      await loadOrders();
      setSnackbar({ 
        message: 'Commande ajoutée avec succès', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la commande:', error);
      let message = 'Erreur lors de l\'ajout de la commande';
      if (error?.response?.data?.error) {
        message += ': ' + error.response.data.error;
      }
      if (error?.response?.data?.details) {
        message += ' (' + error.response.data.details + ')';
      }
      setSnackbar({ 
        message, 
        severity: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await api.delete(`/orders/${id}`);
      setSnackbar({ 
        message: 'Commande supprimée avec succès', 
        severity: 'success' 
      });
      setDeleteId(null);
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande:', error);
      let message = 'Erreur lors de la suppression de la commande';
      if (error?.response?.data?.error) {
        message += ': ' + error.response.data.error;
      }
      if (error?.response?.data?.details) {
        message += ' (' + error.response.data.details + ')';
      }
      setSnackbar({ 
        message, 
        severity: 'error' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditChange = (field, value) => {
    console.log(`Field ${field} changed to:`, value);
    
    // Special handling for quantity to ensure it's a valid number
    if (field === 'quantity' && value !== '') {
      // Allow only numbers and a single decimal point
      const numericValue = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = numericValue.split('.');
      if (parts.length > 2) {
        return; // Don't update if more than one decimal point
      }
      
      setEditData(prev => ({
        ...prev,
        [field]: numericValue
      }));
      return;
    }
    
    // For other fields, update normally
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditOpen = (order) => {
    setEditId(order.id);
    
    // Format the date to YYYY-MM-DD for the date input
    const formattedDate = order.requested_date 
      ? new Date(order.requested_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    const editData = {
      ...initialEditData, // Reset to initial state first
      client_id: order.client_id || '',
      product_id: order.product_id || '',
      quantity: order.quantity ? order.quantity.toString() : '',
      requested_date: formattedDate,
      requested_time: order.requested_time ? order.requested_time.substring(0, 5) : '',
      status: order.status || 'Pending'
    };
    
    setEditData(editData);
    
    // Log for debugging
    console.log('Edit data set:', editData);
  };

  const handleEditSave = async () => {
    if (!editData.client_id || !editData.product_id || !editData.quantity || !editData.requested_date) {
      setSnackbar({ 
        message: 'Veuillez remplir tous les champs obligatoires', 
        severity: 'error' 
      });
      return;
    }
    
    const parsedQuantity = parseFloat(editData.quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setSnackbar({
        message: 'La quantité doit être un nombre positif',
        severity: 'error'
      });
      return;
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editData.requested_date)) {
      setSnackbar({
        message: 'Format de date invalide. Utilisez le format AAAA-MM-JJ',
        severity: 'error'
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Prepare the update payload
      const updateData = {
        client_id: editData.client_id,
        product_id: editData.product_id,
        quantity: parsedQuantity,
        requested_date: editData.requested_date,
        status: editData.status || 'Pending'
      };
      
      // Handle time formatting - ensure HH:MM format
      if (editData.requested_time && editData.requested_time.trim() !== '') {
        // If time is in H:MM or HH:MM format, ensure HH:MM
        if (/^\d{1,2}:\d{2}$/.test(editData.requested_time)) {
          const [hours, minutes] = editData.requested_time.split(':');
          updateData.requested_time = `${hours.padStart(2, '0')}:${minutes}`;
        } else {
          throw new Error('Format d\'heure invalide. Utilisez le format HH:MM');
        }
      } else {
        updateData.requested_time = null;
      }
      
      console.log('Sending update payload:', updateData);
      
      await api.put(`/orders/${editId}`, updateData);
      
      setSnackbar({ 
        message: 'Commande modifiée avec succès', 
        severity: 'success' 
      });
      setEditId(null);
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors de la modification de la commande:', error);
      let message = 'Erreur lors de la modification de la commande';
      if (error?.response?.data?.error) {
        message += ': ' + error.response.data.error;
      }
      if (error?.response?.data?.details) {
        message += ' (' + error.response.data.details + ')';
      }
      setSnackbar({ 
        message, 
        severity: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestion des Commandes</Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom>Nouvelle Commande</Typography>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={isSaving}>
            <InputLabel>Client *</InputLabel>
            <Select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              label="Client"
            >
              {clients.map(client => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={isSaving}>
            <InputLabel>Produit *</InputLabel>
            <Select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              label="Produit"
            >
              {products.map(product => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}{product.type ? ` (${product.type})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Quantité (tonnes) *"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            size="small"
            sx={{ width: 150 }}
            disabled={isSaving}
            inputProps={{ min: 0, step: 0.01 }}
          />
          
          <TextField
            label="Date de livraison *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            size="small"
            disabled={isSaving}
          />
          
          <TextField
            label="Heure de livraison"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            size="small"
            disabled={isSaving}
          />
          
          <Button 
            variant="contained" 
            onClick={handleAdd}
            disabled={!clientId || !productId || !quantity || !date || isSaving}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          >
            {isSaving ? 'Ajout...' : 'Ajouter'}
          </Button>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2 }} elevation={2}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Quantité (t)</TableCell>
                <TableCell>Date livraison</TableCell>
                <TableCell>Heure</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      Aucune commande trouvée
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map(order => {
                  const client = clients.find(c => c.id === order.client_id) || { name: 'Inconnu' };
                  const product = products.find(p => p.id === order.product_id) || { name: 'Inconnu' };
                  
                  return (
                    <TableRow 
                      key={order.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>{client.name}</TableCell>
                      <TableCell>
                        {product.name}
                        {product.type && ` (${product.type})`}
                      </TableCell>
                      <TableCell align="right">{parseFloat(order.quantity).toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.requested_date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{order.requested_time ? order.requested_time.substring(0, 5) : '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status}
                          size="small"
                          color={order.status === 'annulée' ? 'error' : 'warning'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditOpen(order)}
                          disabled={isSaving}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => setDeleteId(order.id)}
                          disabled={isDeleting}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(null)} 
          severity={snackbar?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
      
      <Dialog open={!!deleteId} onClose={() => !isDeleting && setDeleteId(null)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          Êtes-vous sûr de vouloir supprimer cette commande ?
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteId(null)}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button 
            onClick={() => handleDelete(deleteId)} 
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={!!editId} onClose={() => !isSaving && setEditId(null)} fullWidth maxWidth="sm">
  <DialogTitle>Modifier la commande</DialogTitle>
  <DialogContent>
    <Box sx={{ mt: 2 }}>
      <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={isSaving}>
        <InputLabel>Client *</InputLabel>
        <Select
          value={editData.client_id}
          onChange={(e) => handleEditChange('client_id', e.target.value)}
          label="Client"
        >
          {clients.map(client => (
            <MenuItem key={client.id} value={client.id}>
              {client.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={isSaving}>
        <InputLabel>Produit *</InputLabel>
        <Select
          value={editData.product_id}
          onChange={(e) => handleEditChange('product_id', e.target.value)}
          label="Produit"
        >
          {products.map(product => (
            <MenuItem key={product.id} value={product.id}>
              {product.name}{product.type ? ` (${product.type})` : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <TextField
        label="Quantité (tonnes) *"
        type="number"
        value={editData.quantity}
        onChange={(e) => handleEditChange('quantity', e.target.value)}
        fullWidth
        size="small"
        disabled={isSaving}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ mb: 2 }}
      />
      
      <TextField
        label="Date de livraison *"
        type="date"
        value={editData.requested_date}
        onChange={(e) => handleEditChange('requested_date', e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
        size="small"
        disabled={isSaving}
        sx={{ mb: 2 }}
      />
      
      <TextField
        label="Heure de livraison (optionnelle)"
        type="time"
        value={editData.requested_time || ''}
        onChange={(e) => handleEditChange('requested_time', e.target.value || null)}
        InputLabelProps={{ shrink: true }}
        fullWidth
        size="small"
        disabled={isSaving}
        sx={{ mb: 2 }}
      />
      
      <FormControl fullWidth size="small" disabled={isSaving}>
        <InputLabel>Statut</InputLabel>
        <Select
          value={editData.status}
          onChange={(e) => handleEditChange('status', e.target.value)}
          label="Statut"
        >
          {['Pending', 'annulée'].map((status) => (
            <MenuItem key={status} value={status}>
              <Chip 
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                size="small"
                color={status === 'annulée' ? 'error' : 'warning'}
                sx={{ textTransform: 'capitalize' }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  </DialogContent>
  <DialogActions>
    <Button 
      onClick={() => setEditId(null)}
      disabled={isSaving}
    >
      Annuler
    </Button>
    <Button 
      onClick={handleEditSave} 
      variant="contained"
      disabled={isSaving}
      startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
    >
      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
    );
    }
