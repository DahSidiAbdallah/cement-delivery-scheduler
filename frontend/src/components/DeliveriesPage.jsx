import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Snackbar, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl, 
  Chip, TextField, TablePagination, TableSortLabel, Tooltip, DialogContentText, Divider,
  FormHelperText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import Loading from './Loading';

const statusColors = {
  'en attente': 'warning',
  'en cours': 'info',
  'livrée': 'success',
  'annulée': 'error'
};

const formatDateForAPI = (date) => {
  if (!date) return null;
  
  try {
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // If it's a Date object, format it
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (!isValid(dateObj)) {
      console.error('Invalid date:', date);
      return null;
    }
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', date);
    return null;
  }
};

// Format time to HH:MM for the API (backend will add seconds if needed)
const formatTimeForAPI = (time) => {
  if (!time || typeof time !== 'string' || time.trim() === '') {
    return null;
  }
  
  try {
    // If time is in H:MM or HH:MM format, ensure HH:MM
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    console.warn('Unsupported time format, returning as-is:', time);
    return time;
  } catch (error) {
    console.error('Error formatting time:', error, 'Input:', time);
    return null;
  }
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: fr }) : 'Date invalide';
  } catch (error) {
    return 'Date invalide';
  }
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [dependencies, setDependencies] = useState({ 
    orders: [], 
    trucks: [], 
    clients: [], 
    products: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDelivery, setEditDelivery] = useState(null);
  const [form, setForm] = useState({
    order_ids: [],
    truck_id: '',
    scheduled_date: new Date(),
    scheduled_time: '',
    status: 'en attente'
  });
  const [truckCapacity, setTruckCapacity] = useState({ used: 0, total: 0, exceeded: false });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, id: null });

  const loadDeliveries = useCallback(async () => {
    try {
      const response = await api.get('/deliveries');
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      setLoadingError('Erreur lors du chargement des livraisons');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders?status=validée');
      setDependencies(prev => ({ ...prev, orders: response.data }));
    } catch (error) {
      console.error('Error loading orders:', error);
      setLoadingError('Erreur lors du chargement des commandes');
    }
  }, []);

  const loadTrucks = useCallback(async () => {
    try {
      const response = await api.get('/trucks');
      setDependencies(prev => ({ ...prev, trucks: response.data }));
    } catch (error) {
      console.error('Error loading trucks:', error);
      setLoadingError('Erreur lors du chargement des camions');
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await api.get('/products');
      setDependencies(prev => ({ ...prev, products: response.data }));
    } catch (error) {
      console.error('Error loading products:', error);
      setLoadingError('Erreur lors du chargement des produits');
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await api.get('/clients');
      setDependencies(prev => ({ ...prev, clients: response.data }));
    } catch (error) {
      console.error('Error loading clients:', error);
      setLoadingError('Erreur lors du chargement des clients');
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      await Promise.all([
        loadDeliveries(),
        loadOrders(),
        loadTrucks(),
        loadClients(),
        loadProducts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadingError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [loadDeliveries, loadOrders, loadTrucks, loadClients, loadProducts]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleOpenDialog = (delivery = null) => {
    console.log('Opening dialog with delivery:', delivery);
    setEditDelivery(delivery);
    
    try {
      // Ensure we have fresh data when opening the dialog
      loadTrucks();
      loadOrders();
      if (delivery) {
        console.log('Editing delivery with data:', {
          order_ids: delivery.order_ids,
          truck_id: delivery.truck_id,
          scheduled_date: delivery.scheduled_date,
          status: delivery.status
        });
        
        // Parse the date from the API response
        let scheduledDate;
        if (delivery.scheduled_date) {
          scheduledDate = new Date(delivery.scheduled_date);
          if (isNaN(scheduledDate.getTime())) {
            console.warn('Invalid date from API, using current date instead');
            scheduledDate = new Date();
          }
        } else {
          scheduledDate = new Date();
        }
        
        // Ensure order_ids is an array and contains valid values
        const orderIds = Array.isArray(delivery.order_ids) 
          ? delivery.order_ids.filter(id => id != null)
          : [];
        
        setForm({
          order_ids: orderIds,
          truck_id: delivery.truck_id || '',
          scheduled_date: scheduledDate,
          scheduled_time: delivery.scheduled_time || '',
          status: delivery.status || 'en attente'
        });
      } else {
        console.log('Adding new delivery');
        setForm({
          order_ids: [],
          truck_id: '',
          scheduled_date: new Date(),
          scheduled_time: '',
          status: 'en attente'
        });
      }
    } catch (error) {
      console.error('Error in handleOpenDialog:', error);
      // Set default form state on error
      setForm({
        order_ids: [],
        truck_id: '',
        scheduled_date: new Date(),
        scheduled_time: '',
        status: 'en attente'
      });
    }
    
    setDialogOpen(true);
  };

  // Helper function to validate UUID format
  const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
  };

  // Calculate total quantity of selected orders
  const calculateTotalQuantity = useCallback((orderIds) => {
    if (!orderIds || !orderIds.length || !dependencies.orders) return 0;
    
    const total = orderIds.reduce((sum, orderId) => {
      const order = dependencies.orders.find(o => o && o.id === orderId);
      if (!order) return sum;
      
      const quantity = parseFloat(order.quantity);
      return isNaN(quantity) ? sum : sum + quantity;
    }, 0);
    
    console.log('Calculated total quantity:', { orderIds, total });
    return total;
  }, [dependencies.orders]);

  // Check if selected orders exceed truck capacity
  const checkTruckCapacity = useCallback((truckId, orderIds) => {
    try {
      console.log('Checking truck capacity for:', { truckId, orderIds });
      
      // If no truck selected or no orders, reset capacity
      if (!truckId || !orderIds || orderIds.length === 0) {
        console.log('No truck or orders, resetting capacity');
        setTruckCapacity({ used: 0, total: 0, exceeded: false });
        return false;
      }

      const truck = dependencies.trucks?.find(t => t?.id === truckId);
      if (!truck || truck.capacity === null || truck.capacity === undefined) {
        console.log('No capacity info for truck:', truck);
        setTruckCapacity({ used: 0, total: 0, exceeded: false });
        return false;
      }

      const totalQuantity = calculateTotalQuantity(orderIds);
      const truckCapacityValue = parseFloat(truck.capacity);
      const exceeded = totalQuantity > truckCapacityValue;
      
      console.log('Capacity check:', { 
        totalQuantity, 
        truckCapacity: truckCapacityValue, 
        exceeded 
      });
      
      const newCapacity = {
        used: totalQuantity,
        total: truckCapacityValue,
        exceeded: exceeded
      };
      
      setTruckCapacity(newCapacity);
      return newCapacity.exceeded;
    } catch (error) {
      console.error('Error in checkTruckCapacity:', error);
      setTruckCapacity({ used: 0, total: 0, exceeded: false });
      return false;
    }
  }, [dependencies.trucks, calculateTotalQuantity]);

  const validateForm = () => {
    // Validate required fields
    if (!Array.isArray(form.order_ids) || form.order_ids.length === 0) {
      return { valid: false, message: 'Veuillez sélectionner au moins une commande.' };
    }
    
    // Validate truck_id
    if (!form.truck_id) {
      return { valid: false, message: 'Veuillez sélectionner un camion.' };
    }
    
    if (!isValidUUID(form.truck_id)) {
      console.error('Invalid truck_id format:', form.truck_id);
      return { valid: false, message: 'Format du numéro de camion invalide.' };
    }
    
    // Check if truck capacity is exceeded
    if (truckCapacity.exceeded) {
      return { 
        valid: false, 
        message: `Capacité du camion dépassée (${truckCapacity.used} > ${truckCapacity.total})` 
      };
    }
    
    // Validate scheduled_date
    if (!form.scheduled_date) {
      return { valid: false, message: 'Veuillez sélectionner une date de livraison.' };
    }
    
    // Validate order_ids
    const invalidOrderIds = form.order_ids.filter(id => !isValidUUID(id));
    if (invalidOrderIds.length > 0) {
      console.error('Invalid order IDs:', invalidOrderIds);
      return { valid: false, message: 'Un ou plusieurs identifiants de commande sont invalides.' };
    }
    
    // Validate time format if provided
    if (form.scheduled_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.scheduled_time)) {
      return { valid: false, message: 'Format d\'heure invalide. Utilisez le format HH:MM.' };
    }
    
    return { valid: true };
  };
  
  const handleSave = async () => {
    try {
      // Re-validate capacity right before saving
      if (form.truck_id && form.order_ids?.length > 0) {
        const isExceeded = await checkTruckCapacity(form.truck_id, form.order_ids);
        if (isExceeded) {
          setSnackbar({ 
            message: `La capacité du camion est dépassée (${truckCapacity.used.toFixed(1)}T > ${truckCapacity.total.toFixed(1)}T)`, 
            severity: 'error' 
          });
          return;
        }
      }
      
      // Validate other form fields
      const validation = validateForm();
      if (!validation.valid) {
        setSnackbar({ message: validation.message, severity: 'warning' });
        return;
      }
      
      // Check if the delivery is in the future
      const now = new Date();
      const deliveryDate = new Date(form.scheduled_date);
      
      if (form.scheduled_time) {
        const [hours, minutes] = form.scheduled_time.split(':');
        deliveryDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
      
      if (deliveryDate <= now) {
        setSnackbar({ 
          message: 'La livraison doit être programmée dans le futur.', 
          severity: 'warning' 
        });
        return;
      }
      
      // Check for duplicate orders in existing deliveries (excluding current delivery if editing)
      if (form.order_ids.length > 0) {
        const duplicateOrders = deliveries
          .filter(delivery => 
            // Skip current delivery when editing
            !editDelivery || delivery.id !== editDelivery.id
          )
          .flatMap(delivery => delivery.order_ids)
          .filter(orderId => form.order_ids.includes(orderId));
        
        if (duplicateOrders.length > 0) {
          const duplicateDetails = duplicateOrders
            .slice(0, 3) // Show max 3 duplicates to avoid long messages
            .map(orderId => {
              const order = dependencies.orders?.find(o => o?.id === orderId);
              return order ? `#${order.id} (${order.reference || 'sans référence'})` : `#${orderId}`;
            });
          
          const remaining = duplicateOrders.length - 3;
          const moreText = remaining > 0 ? ` et ${remaining} autre(s)` : '';
          
          setSnackbar({
            message: `Certaines commandes sont déjà planifiées : ${duplicateDetails.join(', ')}${moreText}`,
            severity: 'error',
            autoHideDuration: 10000
          });
          return;
        }
      }
      
      setIsSaving(true);
      
      // Format the date to YYYY-MM-DD for the API
      const formattedDate = formatDateForAPI(form.scheduled_date);
      if (!formattedDate) {
        throw new Error('Date invalide');
      }
      
      // Format the time (HH:MM format)
      const formattedTime = form.scheduled_time ? formatTimeForAPI(form.scheduled_time) : null;
      
      // Format the payload to match API expectations
      const payload = {
        order_ids: form.order_ids.map(id => String(id).toLowerCase()),
        truck_id: String(form.truck_id).toLowerCase(),
        scheduled_date: formattedDate,
        scheduled_time: formattedTime,
        status: form.status || 'en attente'
      };
      
      console.log('Sending payload to API:', JSON.stringify(payload, null, 2));
      
      if (editDelivery && editDelivery.id) {
        // Make sure we're using the correct ID format for the API
        const deliveryId = String(editDelivery.id).toLowerCase();
        console.log('Updating delivery with ID:', deliveryId);
        await api.put(`/deliveries/${deliveryId}`, payload);
        setSnackbar({ message: 'Livraison modifiée avec succès', severity: 'success' });
      } else {
        console.log('Creating new delivery');
        await api.post('/deliveries', payload);
        setSnackbar({ message: 'Livraison ajoutée avec succès', severity: 'success' });
      }
      
      setDialogOpen(false);
      await loadAllData();
    } catch (error) {
      console.error('Failed to save delivery:', error);
      let message = 'Erreur lors de la sauvegarde';
      let severity = 'error';
      let autoHideDuration = 10000;
      
      if (error.response) {
        // Handle specific API error messages
        const errorData = error.response.data || {};
        
        // Handle UUID/ID related errors
        if (errorData.details?.includes('hex') || errorData.details?.includes('UUID')) {
          message = 'Erreur de format des données. Veuillez réessayer ou contacter le support.';
          console.error('UUID/ID format error:', errorData.details);
          
          // Try to reload the page to get fresh data
          if (confirm('Une erreur est survenue avec les données. Voulez-vous recharger la page ?')) {
            window.location.reload();
          }
        } 
        // Handle "Order already scheduled" error
        else if (errorData.error === 'Order already scheduled' || errorData.message === 'Order already scheduled') {
          message = 'Une ou plusieurs commandes sont déjà planifiées pour une autre livraison.';
          severity = 'warning';
          
          // Try to extract order IDs from the response if available
          if (errorData.order_ids?.length > 0) {
            const orderDetails = errorData.order_ids
              .slice(0, 3) // Show max 3 orders
              .map(orderId => {
                const order = dependencies.orders?.find(o => o?.id === orderId);
                return order ? `#${order.id} (${order.reference || 'sans référence'})` : `#${orderId}`;
              });
            
            const remaining = errorData.order_ids.length - 3;
            const moreText = remaining > 0 ? ` et ${remaining} autre(s)` : '';
            
            message = `Les commandes suivantes sont déjà planifiées : ${orderDetails.join(', ')}${moreText}`;
          }
        } 
        // Handle other API errors
        else if (errorData.message) {
          message = errorData.message;
          // Make validation errors more user-friendly
          if (error.response.status === 400) {
            severity = 'warning';
          }
        }
        
        // Add details if available
        if (errorData.details) {
          message += ` (${errorData.details})`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        message = 'Pas de réponse du serveur. Vérifiez votre connexion internet.';
      } else {
        // Something happened in setting up the request
        message = error.message || 'Erreur inconnue';
      }
      
      setSnackbar({ 
        message,
        severity,
        autoHideDuration
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update capacity check whenever form data changes
  useEffect(() => {
    if (!form.truck_id || !form.order_ids || form.order_ids.length === 0) {
      setTruckCapacity({ used: 0, total: 0, exceeded: false });
      return;
    }
    
    // Ensure we have valid time format before checking capacity
    if (form.scheduled_time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(form.scheduled_time)) {
        console.warn('Invalid time format, skipping capacity check:', form.scheduled_time);
        return;
      }
    }
    
    checkTruckCapacity(form.truck_id, form.order_ids);
  }, [form.truck_id, form.order_ids, form.scheduled_time, checkTruckCapacity]);

  const handleEditChange = (field, value) => {
    console.log(`Field ${field} changed to:`, value);
    
    // Special handling for time fields
    if (field === 'scheduled_time') {
      // If the value is a Date object from the time picker, format it to HH:MM
      if (value instanceof Date) {
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        value = `${hours}:${minutes}`;
      } else if (typeof value === 'string') {
        // Ensure time is in H:MM or HH:MM format
        if (value !== '' && !/^\d{1,2}:\d{2}$/.test(value)) {
          // If not in correct format, don't update
          console.warn('Invalid time format, expected HH:MM, got:', value);
          return;
        }
      }
      
      // Continue with the update if format is valid
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (value === '' || timeRegex.test(value)) {
        setForm(prev => ({
          ...prev,
          [field]: value
        }));
      }
      return;
    }
    
    // Update form state
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // For truck or order changes, the useEffect will handle capacity check
    if (field === 'truck_id' || field === 'order_ids') {
      console.log(`Handling ${field} change - capacity check will be triggered by useEffect`);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmation({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/deliveries/${deleteConfirmation.id}`);
      setSnackbar({ message: "Livraison supprimée avec succès", severity: "success" });
      setDeleteConfirmation({ open: false, id: null });
      await loadAllData(); // Changed from loadPageData to loadAllData
    } catch (error) {
      console.error("Failed to delete delivery:", error);
      let message = error.response?.data?.message || "Erreur lors de la suppression.";
      if (error.response?.data?.details) message += ` (${error.response.data.details})`;
      setSnackbar({ message, severity: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const getOrderDetails = (orderId) => {
    if (orderId == null) return 'ID de commande invalide';
    
    try {
      // Find order by ID
      const order = dependencies.orders?.find(o => o && o.id === orderId);
      if (!order) {
        console.warn(`Order with ID ${orderId} not found in dependencies.orders`);
        return `Commande ${orderId} (non trouvée)`;
      }
      
      // Get client and product details
      const client = dependencies.clients?.find(c => c && c.id === order.client_id);
      const product = dependencies.products?.find(p => p && p.id === order.product_id);
      
      // Format the order details
      return `${client?.name || 'Client inconnu'} (${order.quantity || 0}t - ${product?.name || 'Produit inconnu'}${product?.type ? ` - ${product.type}` : ''})`;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      return `Commande ${orderId} (erreur)`;
    }
  };
  
  const getTruckDetails = (truckId) => {
    const truck = dependencies.trucks?.find(t => t.id === truckId);
    return truck ? `${truck.plate_number} (${truck.driver_name})` : 'Non défini';
  };

  if (isLoading && deliveries.length === 0) {
    return <Loading message="Chargement des livraisons..." />;
  }

  if (loadingError) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" gutterBottom>Erreur de chargement</Typography>
        <Typography color="textSecondary" paragraph>{loadingError}</Typography>
        <Button variant="contained" color="primary" onClick={loadAllData} startIcon={<RefreshIcon />} disabled={isLoading}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Gestion des Livraisons</Typography>
        <Box>
          <Button variant="outlined" onClick={loadAllData} startIcon={<RefreshIcon />} disabled={isLoading} sx={{ mr: 1 }}>
            Rafraîchir
          </Button>
          <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<AddIcon />} disabled={isLoading}>
            Ajouter une livraison
          </Button>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Commandes</TableCell>
                <TableCell>Camion</TableCell>
                <TableCell>Date Prévue</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.length > 0 ? (
                deliveries.map(delivery => (
                  <TableRow key={delivery.id} hover>
                    <TableCell>
                      {delivery.order_ids?.map(orderId => (
                        <div key={orderId}>{getOrderDetails(orderId)}</div>
                      )) || 'Aucune commande'}
                    </TableCell>
                    <TableCell>{getTruckDetails(delivery.truck_id)}</TableCell>
                    <TableCell>{formatDateForDisplay(delivery.scheduled_date)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={delivery.status}
                        size="small" 
                        color={statusColors[delivery.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenDialog(delivery)} disabled={isSaving || isDeleting}><EditIcon /></IconButton>
                      <IconButton onClick={() => handleDelete(delivery.id)} disabled={isSaving || isDeleting}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">Aucune livraison trouvée. Commencez par en ajouter une.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editDelivery ? 'Modifier la livraison' : 'Ajouter une livraison'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="orders-select-label">Commandes</InputLabel>
            <Select
              labelId="orders-select-label"
              multiple
              value={form.order_ids}
              onChange={(e) => setForm({ ...form, order_ids: e.target.value })}
              label="Commandes"
              disabled={isSaving}
            >
              {dependencies.orders.map(order => (
                <MenuItem key={order.id} value={order.id}>{getOrderDetails(order.id)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" error={truckCapacity.exceeded}>
            <InputLabel id="truck-select-label">Camion</InputLabel>
            <Select
              labelId="truck-select-label"
              id="truck-select"
              value={form.truck_id}
              onChange={(e) => handleEditChange('truck_id', e.target.value)}
              label="Camion"
              disabled={isSaving}
              error={truckCapacity.exceeded}
            >
              {dependencies.trucks && dependencies.trucks.map((truck) => {
                const truckCapacity = parseFloat(truck.capacity);
                const capacityText = !isNaN(truckCapacity) ? ` (Capacité: ${truckCapacity}T)` : '';
                return (
                  <MenuItem key={truck.id} value={truck.id}>
                    {truck.plate_number} {truck.driver_name ? `(${truck.driver_name})` : ''}{capacityText}
                  </MenuItem>
                );
              })}
            </Select>
            {truckCapacity.exceeded && (
              <FormHelperText error>
                {`Capacité dépassée: ${truckCapacity.used.toFixed(2)}T > ${truckCapacity.total.toFixed(2)}T`}
              </FormHelperText>
            )}
            {form.truck_id && !truckCapacity.exceeded && truckCapacity.total > 0 && (
              <FormHelperText>
                {`Capacité utilisée: ${truckCapacity.used.toFixed(2)}T / ${truckCapacity.total.toFixed(2)}T`}
              </FormHelperText>
            )}
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <Box display="flex" gap={2} mb={2}>
              <DatePicker
                label="Date de livraison"
                value={form.scheduled_date}
                onChange={(date) => setForm({ ...form, scheduled_date: date })}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth 
                    margin="normal" 
                    disabled={isSaving} 
                    required
                  />
                )}
              />
              <TextField
                label="Heure (HH:MM)"
                type="time"
                value={form.scheduled_time || ''}
                onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                fullWidth
                margin="normal"
                disabled={isSaving}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300, // 5 min
                }}
              />
            </Box>
          </LocalizationProvider>
          <FormControl fullWidth margin="normal">
            <InputLabel id="status-select-label">Statut</InputLabel>
            <Select
              labelId="status-select-label"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              label="Statut"
              disabled={isSaving}
            >
              {Object.keys(statusColors).map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} /> : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmation.open} onClose={() => setDeleteConfirmation({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer cette livraison ? Cette action est irréversible.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation({ open: false, id: null })} disabled={isDeleting}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={6000} onClose={() => setSnackbar(null)}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity || 'info'} sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
