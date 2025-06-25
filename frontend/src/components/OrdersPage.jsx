// src/components/OrdersPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
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
import RefreshIcon from '@mui/icons-material/Refresh';

const statusColors = {
  'Pending': 'warning',
  'annulée': 'error'
};

export default function OrdersPage() {
  const { role } = useContext(AuthContext);
  const isViewer = role === 'viewer';
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
  // Set default date and time to current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5); // Get HH:MM format
  
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState(currentTime);
  
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
      // Filter out delivered orders from the list
      const filteredOrders = response.data.filter(order => order.status !== 'Livrée');
      setOrders(filteredOrders);
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
      
      const resetForm = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);
        
        setClientId('');
        setProductId('');
        setQuantity('');
        setDate(currentDate);
        setTime(currentTime);
      };
      
      resetForm();
      
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
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Button
          variant="outlined"
          onClick={loadAllData}
          startIcon={<RefreshIcon />}
          sx={{ 
            whiteSpace: 'nowrap',
            py: { xs: 1, sm: 0.5 },
            fontSize: { xs: '0.875rem', sm: '0.9375rem' }
          }}
        >
          Actualiser
        </Button>
      </Box>
    );
  }


  return (
    <Box sx={{ p: 3 }}>
      {!isViewer && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Nouvelle Commande</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
              label="Date de Commande *"
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
              label="Heure de Commande"
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
      )}

      <Paper sx={{ p: 2, overflow: 'auto' }} elevation={2}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 120 }}>Client</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Produit</TableCell>
                <TableCell sx={{ minWidth: 80 }}>Quantité</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Date</TableCell>
                <TableCell sx={{ minWidth: 80 }}>Heure</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Statut</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length > 0 ? (
                orders.map(order => {
                  const client = clients.find(c => c.id === order.client_id) || { name: 'Inconnu' };
                  const product = products.find(p => p.id === order.product_id) || { name: 'Inconnu' };
                  
                  return (
                    <TableRow key={order.id} hover>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{product.name}{product.type ? ` (${product.type})` : ''}</TableCell>
                      <TableCell>{parseFloat(order.quantity).toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.requested_date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{order.requested_time ? order.requested_time.substring(0, 5) : '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status}
                          color={order.status === 'annulée' ? 'error' : 'warning'}
                          size="small"
                          sx={{ 
                            textTransform: 'capitalize',
                            minWidth: 80,
                            justifyContent: 'center'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {!isViewer && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              color="primary" 
                              onClick={() => handleEditOpen(order)}
                              size="small"
                              disabled={isSaving}
                              sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              color="error" 
                              onClick={() => setDeleteId(order.id)}
                              size="small"
                              disabled={isDeleting}
                              sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">
                      Aucune commande trouvée
                    </Typography>
                  </TableCell>
                </TableRow>
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
              fullWidth
              size="small"
              label="Quantité (tonnes) *"
              type="number"
              value={editData.quantity}
              onChange={(e) => handleEditChange('quantity', e.target.value)}
              sx={{ mb: 2 }}
              disabled={isSaving}
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            <TextField
              fullWidth
              size="small"
              label="Date de Commande *"
              type="date"
              value={editData.requested_date}
              onChange={(e) => handleEditChange('requested_date', e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ mb: 2 }}
              disabled={isSaving}
            />
            
            <TextField
              fullWidth
              size="small"
              label="Heure de Commande"
              type="time"
              value={editData.requested_time || ''}
              onChange={(e) => handleEditChange('requested_time', e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ mb: 2 }}
              disabled={isSaving}
            />
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={isSaving}>
              <InputLabel>Statut *</InputLabel>
              <Select
                value={editData.status}
                onChange={(e) => handleEditChange('status', e.target.value)}
                label="Statut"
              >
                <MenuItem value="En attente">En attente</MenuItem>
                <MenuItem value="En cours">En cours</MenuItem>
                <MenuItem value="Livrée">Livrée</MenuItem>
                <MenuItem value="Annulée">Annulée</MenuItem>
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
            color="primary"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : null}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    );
  }
