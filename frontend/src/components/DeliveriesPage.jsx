import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Snackbar, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl, 
  Chip, TextField, TablePagination, TableSortLabel, Tooltip, DialogContentText, Divider,
  FormHelperText, Avatar, Stack
} from '@mui/material';
import NotesIcon from '@mui/icons-material/Notes';
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
    // Handle time input format (HH:MM)
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    // Handle time input with seconds (HH:MM:SS)
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    // Handle other possible time formats
    if (/^\d{1,2}h\d{2}$/.test(time)) {
      const [hours, minutes] = time.replace('h', ':').split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    if (/^\d{1,2}h\d{2}min$/.test(time)) {
      const [hours, minutes] = time.replace('h', ':').replace('min', '').split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    console.warn('Unsupported time format, returning null for:', time);
    return null;
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
    status: 'en attente',
    destination: '',
    notes: ''
  });
  const [truckCapacity, setTruckCapacity] = useState({ used: 0, total: 0, exceeded: false });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, id: null });
  
  // Get user role from AuthContext
  const { role } = useContext(AuthContext);
  const isViewer = role === 'viewer';

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
      setEditDelivery(delivery);
      
      if (delivery) {
        console.log('Editing delivery:', delivery);
        
        // Parse scheduled date or use current date if invalid
        let scheduledDate = new Date();
        if (delivery.scheduled_date) {
          scheduledDate = new Date(delivery.scheduled_date);
          if (isNaN(scheduledDate.getTime())) {
            console.warn('Invalid date from API, using current date instead');
            scheduledDate = new Date();
          }
        } else {
          scheduledDate = new Date();
        }
        
        // Get the order IDs for this delivery
        let orderIds = [];
        if (delivery.order_ids && Array.isArray(delivery.order_ids)) {
          // If we have order_ids directly on the delivery
          orderIds = delivery.order_ids.filter(id => id != null);
        } else if (delivery.orders && Array.isArray(delivery.orders)) {
          // If we have orders array with full order objects
          orderIds = delivery.orders.map(order => order.id).filter(id => id != null);
        } else if (delivery.order_id) {
          // Fallback to single order_id
          orderIds = [delivery.order_id];
        }
        
        // If we still don't have order IDs, try to get them from the delivery_orders relationship
        if (orderIds.length === 0 && delivery.delivery_orders) {
          orderIds = delivery.delivery_orders
            .map(doRel => doRel.order_id)
            .filter(id => id != null);
        }
        
        console.log('Setting order IDs for editing:', orderIds);
        
        // Convert truck_id to string if it exists, or use empty string
        const truckId = delivery.truck_id ? String(delivery.truck_id) : '';
        
        setForm({
          order_ids: orderIds,
          truck_id: truckId,
          scheduled_date: scheduledDate,
          scheduled_time: delivery.scheduled_time || '',
          status: delivery.status || 'en attente',
          destination: delivery.destination || '',
          notes: delivery.notes || ''
        });
        
        // If we have a truck ID, trigger capacity check
        if (delivery.truck_id && orderIds.length > 0) {
          checkTruckCapacity(delivery.truck_id, orderIds);
        }
      } else {
        console.log('Adding new delivery');
        setForm({
          order_ids: [],
          truck_id: '',
          scheduled_date: new Date(),
          scheduled_time: '',
          status: 'en attente',
          destination: '',
          notes: ''
        });
        setTruckCapacity({ used: 0, total: 0, exceeded: false });
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
      setTruckCapacity({ used: 0, total: 0, exceeded: false });
      setSnackbar({ 
        message: 'Erreur lors du chargement de la livraison', 
        severity: 'error' 
      });
    }
    
    setDialogOpen(true);
  };

  // Helper function to validate and normalize UUID format
  const normalizeUUID = (uuid) => {
    try {
      if (!uuid) return null;
      
      // Convert to string and trim whitespace
      const str = String(uuid).trim().toLowerCase();
      
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(str)) {
        return str; // Return in lowercase for consistency
      }
      
      console.warn('Invalid UUID format:', uuid);
      return null;
    } catch (error) {
      console.error('Error in normalizeUUID:', error, 'Input:', uuid);
      return null;
    }
  };
  
  // Alias for backward compatibility
  const isValidUUID = normalizeUUID;

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

  // Validate form fields
  const validateForm = () => {
    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(form.scheduled_date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return { valid: false, message: 'La date de livraison ne peut pas être dans le passé' };
    }
    
    // If time is provided, validate it
    if (form.scheduled_time) {
      // First validate the time format (accepts both HH:MM and HH:MM:SS)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timeRegex.test(form.scheduled_time)) {
        return { valid: false, message: 'Format d\'heure invalide. Utilisez le format HH:MM.' };
      }
      
      // Extract hours and minutes (handle both HH:MM and HH:MM:SS formats)
      const [hours, minutes] = form.scheduled_time.split(':');
      
      // Check if the time is in the past for today
      const now = new Date();
      if (selectedDate.getTime() === today.getTime()) {
        const deliveryTime = new Date();
        deliveryTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        
        if (deliveryTime < now) {
          return { valid: false, message: 'L\'heure de livraison ne peut pas être dans le passé' };
        }
      }
    }
    
    // Validate destination
    if (!form.destination || form.destination.trim() === '') {
      return { valid: false, message: 'Veuillez spécifier une destination' };
    }
    
    return { valid: true };
  };

  // Check if orders are already scheduled in other deliveries
  const validateOrdersBeforeSave = useCallback(async (orderIds, currentDeliveryId = null) => {
    if (!orderIds || orderIds.length === 0) {
      return { valid: false, message: 'Aucune commande sélectionnée' };
    }

    try {
      // Get all orders with their delivery status
      const allOrders = dependencies.orders?.filter(o => orderIds.includes(o.id));
      if (!allOrders || allOrders.length === 0) {
        return { valid: false, message: 'Aucune commande valide trouvée' };
      }
      
      // Check if any orders are already in a delivery (excluding current delivery if editing)
      const scheduledOrders = [];
      
      for (const order of allOrders) {
        try {
          const deliveryResponse = await api.get(`/orders/${order.id}/deliveries`);
          let deliveries = Array.isArray(deliveryResponse.data) ? deliveryResponse.data : [];
          
          // If editing, filter out the current delivery from the list
          if (currentDeliveryId) {
            deliveries = deliveries.filter(d => d.id !== currentDeliveryId);
          }
          
          if (deliveries.length > 0) {
            const delivery = deliveries[0]; // Get the first delivery
            scheduledOrders.push({
              order,
              delivery
            });
          }
        } catch (error) {
          console.error(`Error checking order ${order.id} deliveries:`, error);
          // Continue with other orders if one fails
        }
      }
      
      if (scheduledOrders.length > 0) {
        const orderDetails = scheduledOrders.map(({ order, delivery }) => {
          const clientName = order.client?.name || 'Client inconnu';
          const productName = order.product?.name || 'produit inconnu';
          const productType = order.product?.type ? ` (${order.product.type})` : '';
          
          let scheduleInfo = '';
          if (delivery?.scheduled_date) {
            const date = new Date(delivery.scheduled_date);
            scheduleInfo = ` (Planifiée pour le ${date.toLocaleDateString('fr-FR')}`;
            if (delivery.scheduled_time) {
              scheduleInfo += ` à ${delivery.scheduled_time}`;
            }
            scheduleInfo += ')';
          }
          
          return `- ${clientName}: ${order.quantity}T de ${productName}${productType}${scheduleInfo}`;
        });
        
        return {
          valid: false,
          message: [
            'Les commandes suivantes sont déjà planifiées :',
            ...orderDetails
          ].join('\n')
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Error validating orders:', error);
      return { 
        valid: false, 
        message: 'Erreur lors de la vérification des commandes. Veuillez réessayer.'
      };
    }
  }, [dependencies.orders]);

  const handleSave = async () => {
    try {
      // Basic validation
      if (!form.order_ids || form.order_ids.length === 0) {
        setSnackbar({ 
          message: 'Veuillez sélectionner au moins une commande', 
          severity: 'warning' 
        });
        return;
      }

      // For new deliveries, check if orders are already scheduled
      if (!editDelivery) {
        const orderValidation = await validateOrdersBeforeSave(form.order_ids);
        if (!orderValidation.valid) {
          setSnackbar({ 
            message: orderValidation.message,
            severity: 'warning'
          });
          return;
        }
      }

      // Validate truck capacity if we have orders and a truck
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
      
      console.log(editDelivery ? 'Updating delivery...' : 'Creating delivery...');
      setIsSaving(true);
      
      // Prepare the order IDs - allow empty array for removing all orders from a delivery
      const orderIds = Array.isArray(form.order_ids) 
        ? form.order_ids.filter(id => id != null && id !== '')
        : [];
      
      // Only require orders for new deliveries
      if (!editDelivery && orderIds.length === 0) {
        setSnackbar({ 
          message: 'Veuillez sélectionner au moins une commande', 
          severity: 'warning' 
        });
        setIsSaving(false);
        return;
      }
      
      // Prepare the payload
      const payload = {
        // Only include order_id if we have orders (for backward compatibility)
        ...(orderIds.length > 0 && { 
          order_id: orderIds[0],
          order_ids: orderIds 
        }),
        scheduled_date: formatDateForAPI(form.scheduled_date || new Date()),
        scheduled_time: form.scheduled_time ? formatTimeForAPI(form.scheduled_time) : null,
        status: form.status || 'en attente',
        destination: form.destination || '',
        notes: form.notes || ''
      };
      
      // Handle truck_id - always include it in the payload when updating
      // Convert empty string to null for the backend
      if (editDelivery) {
        payload.truck_id = form.truck_id || null;
      } else if (form.truck_id) {
        // For new deliveries, only include if it has a value
        payload.truck_id = form.truck_id;
      }
      
      // If we're updating and have no orders, explicitly set empty array
      if (editDelivery && orderIds.length === 0) {
        payload.order_ids = [];
      }

      console.log('Sending payload:', payload);
      
      // Make the API call
      const response = editDelivery 
        ? await api.put(`/deliveries/${editDelivery.id}`, payload)
        : await api.post('/deliveries', payload);
      
      console.log('Save successful, response:', response.data);
      
      // Show success message
      setSnackbar({ 
        message: `Livraison ${editDelivery ? 'mise à jour' : 'créée'} avec succès`, 
        severity: 'success' 
      });
      
      // Close dialog and refresh data
      setDialogOpen(false);
      setEditDelivery(null);
      await loadAllData();
      
      // Reset form
      setForm({
        order_ids: [],
        truck_id: '',
        scheduled_date: new Date(),
        scheduled_time: '',
        status: 'en attente',
        destination: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error saving delivery:', error);
      let errorMessage = 'Erreur lors de la sauvegarde';
      
      if (error.response) {
        // Handle specific error cases
        if (error.response.data) {
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.details) {
            errorMessage = error.response.data.details;
          }
        }
        
        if (error.response.status === 400) {
          errorMessage = errorMessage || 'Données invalides. Veuillez vérifier les informations saisies.';
        } else if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.response.status === 404) {
          errorMessage = 'Ressource non trouvée. Veuillez rafraîchir la page.';
        } else if (error.response.status === 409) {
          errorMessage = 'Conflit de données : ' + (errorMessage || 'Certaines commandes sont déjà planifiées');
        } else if (error.response.status >= 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Pas de réponse du serveur. Vérifiez votre connexion internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnackbar({ 
        message: errorMessage,
        severity: 'error',
        autoHideDuration: 10000 // Show error messages longer
      });
    } finally {
      setIsSaving(false);
    }
  };
  
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

  const handleOrderSelect = async (event) => {
    const selectedIds = event.target.value;
    setForm(prev => ({
      ...prev,
      order_ids: selectedIds
    }));
    
    // Check capacity in real-time when orders change
    if (form.truck_id && selectedIds.length > 0) {
      await checkTruckCapacity(form.truck_id, selectedIds);
    } else {
      setTruckCapacity({ used: 0, total: 0, exceeded: false });
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
          {!isViewer && (
            <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<AddIcon />} disabled={isLoading}>
              Ajouter une livraison
            </Button>
          )}
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
                <TableCell>Destination</TableCell>
                <TableCell>Notes</TableCell>
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
                    <TableCell>{delivery.destination || 'Non spécifiée'}</TableCell>
                    <TableCell>
                      {delivery.notes ? (
                        <Tooltip title={delivery.notes} arrow>
                          <Chip
                            icon={<NotesIcon />}
                            label={delivery.notes.length > 20 ? `${delivery.notes.substring(0, 20)}...` : delivery.notes}
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ 
                              maxWidth: '200px',
                              '& .MuiChip-label': {
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block'
                              }
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Aucune note"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
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
          <FormControl fullWidth margin="normal" error={truckCapacity.exceeded}>
            <InputLabel>Commandes *</InputLabel>
            <Select
              multiple
              value={form.order_ids || []}
              onChange={handleOrderSelect}
              label="Commandes *"
              renderValue={(selected) => `${selected.length} commande(s) sélectionnée(s)`}
              required
            >
              {truckCapacity.total > 0 && (
                <Box sx={{ p: 1, bgcolor: truckCapacity.exceeded ? '#ffebee' : '#e8f5e9', borderRadius: 1, m: 1 }}>
                  <Typography variant="caption" color={truckCapacity.exceeded ? 'error' : 'textSecondary'}>
                    Capacité: {truckCapacity.used.toFixed(1)}T / {truckCapacity.total.toFixed(1)}T
                    {truckCapacity.exceeded && ' (Dépassement de capacité!)'}
                  </Typography>
                </Box>
              )}
              {dependencies.orders.map(order => (
                <MenuItem key={order.id} value={order.id}>{getOrderDetails(order.id)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" error={truckCapacity.exceeded}>
            <InputLabel>Camion *</InputLabel>
            <Select
              value={form.truck_id || ''}
              onChange={(e) => handleEditChange('truck_id', e.target.value)}
              label="Camion *"
              required
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
                onChange={(e) => {
                  // Ensure consistent time format (HH:MM)
                  const timeValue = e.target.value;
                  if (timeValue) {
                    const [hours, minutes] = timeValue.split(':');
                    const formattedTime = `${hours.padStart(2, '0')}:${minutes}`;
                    setForm({ ...form, scheduled_time: formattedTime });
                  } else {
                    setForm({ ...form, scheduled_time: '' });
                  }
                }}
                fullWidth
                margin="normal"
                disabled={isSaving}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300, // 5 min
                }}
                placeholder="HH:MM"
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
          <TextField
            label="Destination"
            value={form.destination || ''}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            fullWidth
            margin="normal"
            required
            disabled={isSaving}
          />
          <TextField
            label="Notes"
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={3}
            disabled={isSaving}
            placeholder="Ajoutez des notes ou des instructions pour cette livraison"
          />
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
