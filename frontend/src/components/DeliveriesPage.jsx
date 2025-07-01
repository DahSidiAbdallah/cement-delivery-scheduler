import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Snackbar, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl, 
  Chip, TextField, TablePagination, TableSortLabel, Tooltip, DialogContentText, Divider,
  FormHelperText, Avatar, Stack, List, ListItem, ListItemText, ListItemAvatar, Badge
} from '@mui/material';
import NotesIcon from '@mui/icons-material/Notes';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
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
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  
  // Get user role from AuthContext
  const { role } = useContext(AuthContext);
  const isViewer = role === 'viewer';

  const loadDeliveries = useCallback(async () => {
    try {
      // Include history in the response
      const response = await api.get('/deliveries?include_history=true');
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      setLoadingError('Erreur lors du chargement des livraisons');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      // Show loading state
      setLoadingError(null);
      
      // Fetch both 'en attente' and 'validée' orders
      const [pendingResponse, validatedResponse] = await Promise.all([
        api.get('/orders?status=en attente').catch(() => ({ data: [] })),
        api.get('/orders?status=validée').catch(() => ({ data: [] }))
      ]);
      
      // Combine both sets of orders
      const allOrders = [...(pendingResponse?.data || []), ...(validatedResponse?.data || [])];
      
      if (allOrders.length === 0) {
        setLoadingError('Aucune commande disponible pour le moment');
      }
      
      // Remove duplicates by order ID in case any order appears in both responses
      const uniqueOrders = Array.from(new Map(allOrders.map(order => [order.id, order])).values());
      
      setDependencies(prev => ({ ...prev, orders: uniqueOrders }));
    } catch (error) {
      console.error('Error loading orders:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du chargement des commandes';
      setLoadingError(errorMessage);
      setSnackbar({ message: errorMessage, severity: 'error' });
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

  const validateTimeFormat = (time) => {
    if (!time) return true; // Empty is allowed
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!form.order_ids || form.order_ids.length === 0) {
        setSnackbar({ 
          message: 'Veuillez sélectionner au moins une commande', 
          severity: 'warning',
          autoHideDuration: 5000
        });
        return;
      }
      
      // Validate time format
      if (form.scheduled_time && !validateTimeFormat(form.scheduled_time)) {
        setSnackbar({
          message: 'Format d\'heure invalide. Utilisez HH:MM (ex: 14:30)',
          severity: 'error',
          autoHideDuration: 5000
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
      
      // Format the order date and time
      const orderDate = order.requested_date ? new Date(order.requested_date) : null;
      const formattedDate = orderDate ? format(orderDate, 'dd/MM/yyyy', { locale: fr }) : 'Date inconnue';
      const formattedTime = order.requested_time ? order.requested_time.slice(0, 5) : ''; // Format as HH:MM
      
      // Format the order details with date and time
      const details = [
        client?.name || 'Client inconnu',
        `${order.quantity || 0}T`,
        product?.name ? `de ${product.name}` : '',
        product?.type ? `(${product.type})` : '',
        `- ${formattedDate}`,
        formattedTime ? `à ${formattedTime}` : ''
      ].filter(Boolean).join(' ');
      
      return details;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      return `Commande ${orderId} (erreur d'affichage)`;
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
                <TableCell>Retard</TableCell>
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
                    <TableCell>
                      {delivery.delayed && (
                        <Chip 
                          icon={<WarningIcon />}
                          label="En retard"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Voir l'historique">
                        <IconButton 
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setHistoryDialogOpen(true);
                          }}
                          disabled={isSaving || isDeleting}
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton 
                        onClick={() => handleOpenDialog(delivery)} 
                        disabled={isSaving || isDeleting}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleDelete(delivery.id)} 
                        disabled={isSaving || isDeleting}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">Aucune livraison trouvée. Commencez par en ajouter une.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Historique de la livraison</DialogTitle>
        <DialogContent>
          {selectedDelivery && selectedDelivery.history && selectedDelivery.history.length > 0 ? (
            <List>
              {selectedDelivery.history.map((record, index) => (
                <React.Fragment key={record.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        {record.changed_by ? record.changed_by.charAt(0).toUpperCase() : 'S'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <>
                          <Chip 
                            label={record.status} 
                            size="small" 
                            color={statusColors[record.status] || 'default'}
                            sx={{ mr: 1 }}
                          />
                          <Typography component="span" variant="caption" color="textSecondary">
                            {new Date(record.changed_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {record.changed_by || 'Système'}
                          </Typography>
                          {record.notes && ` — ${record.notes}`}
                        </>
                      }
                    />
                  </ListItem>
                  {index < selectedDelivery.history.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 2 }}>
              Aucun historique disponible pour cette livraison.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Form Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editDelivery ? 'Modifier la livraison' : 'Nouvelle livraison'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="order-select-label">Commandes</InputLabel>
              <Select
                labelId="order-select-label"
                id="order-select"
                multiple
                value={form.order_ids || []}
                onChange={handleOrderSelect}
                label="Commandes"
                disabled={isViewer}
              >
                {dependencies.orders?.filter(order => order.status === 'en attente' || order.status === 'validée').map((order) => (
                  <MenuItem key={order.id} value={order.id}>
                    {order.client?.name} - {order.quantity}t de {order.product?.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="truck-select-label">Camion</InputLabel>
              <Select
                labelId="truck-select-label"
                id="truck-select"
                value={form.truck_id || ''}
                onChange={(e) => handleEditChange('truck_id', e.target.value)}
                label="Camion"
                disabled={isViewer}
              >
                <MenuItem value="">
                  <em>Sélectionner un camion</em>
                </MenuItem>
                {dependencies.trucks?.map((truck) => (
                  <MenuItem key={truck.id} value={truck.id}>
                    {truck.plate_number} - {truck.driver_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <DatePicker
                label="Date de livraison"
                value={form.scheduled_date}
                onChange={(newValue) => handleEditChange('scheduled_date', newValue)}
                renderInput={(params) => (
                  <TextField {...params} fullWidth margin="normal" />
                )}
                minDate={new Date()}
                disabled={isViewer}
              />
            </LocalizationProvider>

            <TextField
              label="Heure de livraison"
              fullWidth
              margin="normal"
              type="time"
              value={form.scheduled_time || ''}
              onChange={(e) => {
                // Format the time to HH:MM
                let timeValue = e.target.value;
                if (timeValue && timeValue.length === 5) {
                  // Ensure proper formatting
                  const [hours, minutes] = timeValue.split(':');
                  if (hours && minutes) {
                    timeValue = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
                  }
                }
                handleEditChange('scheduled_time', timeValue);
              }}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                step: 300, // 5 min
              }}
              disabled={isViewer}
              error={!!form.scheduled_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.scheduled_time)}
              helperText={form.scheduled_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.scheduled_time) 
                ? 'Format invalide. Utilisez HH:MM (ex: 14:30)' 
                : ''}
            />

            <TextField
              label="Destination"
              fullWidth
              margin="normal"
              value={form.destination}
              onChange={(e) => handleEditChange('destination', e.target.value)}
              disabled={isViewer}
              required
            />

            <TextField
              label="Notes"
              fullWidth
              margin="normal"
              value={form.notes}
              onChange={(e) => handleEditChange('notes', e.target.value)}
              multiline
              rows={3}
              disabled={isViewer}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel id="status-select-label">Statut</InputLabel>
              <Select
                labelId="status-select-label"
                id="status-select"
                value={form.status || 'en attente'}
                onChange={(e) => handleEditChange('status', e.target.value)}
                label="Statut"
                disabled={isViewer}
              >
                <MenuItem value="en attente">En attente</MenuItem>
                <MenuItem value="programmé">Programmé</MenuItem>
                <MenuItem value="en cours">En cours</MenuItem>
                <MenuItem value="livrée">Livrée</MenuItem>
                <MenuItem value="annulée">Annulée</MenuItem>
              </Select>
            </FormControl>

            {truckCapacity.total > 0 && (
              <Box mt={2}>
                <Typography variant="body2" color={truckCapacity.exceeded ? 'error' : 'textSecondary'}>
                  Capacité du camion: {truckCapacity.used.toFixed(1)}T / {truckCapacity.total.toFixed(1)}T
                  {truckCapacity.exceeded && ' (Capacité dépassée!)'}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          {!isViewer && (
            <Button 
              onClick={handleSave} 
              variant="contained" 
              color="primary"
              disabled={isSaving || (truckCapacity.exceeded && form.status !== 'annulée')}
            >
              {isSaving ? <CircularProgress size={24} /> : 'Enregistrer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
