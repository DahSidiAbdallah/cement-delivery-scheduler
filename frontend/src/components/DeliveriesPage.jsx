import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Snackbar, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  CircularProgress, 
  Alert, 
  MenuItem, 
  Select, 
  InputLabel, 
  FormControl, 
  Chip, 
  TextField, 
  TablePagination, 
  TableSortLabel, 
  Tooltip, 
  DialogContentText, 
  Divider,
  FormHelperText, 
  Avatar, 
  Stack, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Badge
} from '@mui/material';
import NotesIcon from '@mui/icons-material/Notes';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import Loading from './Loading';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';



const statusColors = {
  'programmé': 'warning',
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

const parseApiError = (error, defaultMessage = 'Une erreur est survenue') => {
  if (error.response) {
    const data = error.response.data || {};
    let message = data.message || data.error || data.details || defaultMessage;

    switch (error.response.status) {
      case 400:
        message = message || "Données invalides. Veuillez vérifier les informations saisies.";
        break;
      case 401:
        message = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 404:
        message = 'Ressource non trouvée. Veuillez rafraîchir la page.';
        break;
      case 409:
        message = `Conflit de données : ${message}`;
        break;
      default:
        if (error.response.status >= 500) {
          message = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
    }

    return message;
  }

  if (error.request) {
    return 'Pas de réponse du serveur. Vérifiez votre connexion internet.';
  }

  return error.message || defaultMessage;
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
    is_external: false,
    external_truck_label: '',
    scheduled_date: new Date(),
    scheduled_time: '',
    status: 'programmé',
    destination: '',
    notes: ''
  });
  const [orderQuantities, setOrderQuantities] = useState({});
  const [formErrors, setFormErrors] = useState({
    order_ids: '',
    truck_id: '',
    external_truck_label: '',
    scheduled_date: '',
    scheduled_time: '',
    destination: ''
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
      
      // Fetch both 'en attente' and 'validée' orders with client and product data
      const [pendingResponse, validatedResponse, clientsResponse, productsResponse] = await Promise.all([
        api.get('/orders?status=en attente').catch(() => ({ data: [] })),
        api.get('/orders?status=validée').catch(() => ({ data: [] })),
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] }))
      ]);
      
      // Combine both sets of orders
      const allOrders = [...(pendingResponse?.data || []), ...(validatedResponse?.data || [])];
      const clients = clientsResponse?.data || [];
      const products = productsResponse?.data || [];
      
      if (allOrders.length === 0) {
        setLoadingError('Aucune commande disponible pour le moment');
      }
      
      // Enrich orders with client and product data
      const enrichedOrders = allOrders.map(order => {
        const client = clients.find(c => String(c.id) === String(order.client_id));
        const product = products.find(p => String(p.id) === String(order.product_id));
        
        return {
          ...order,
          client: client || { id: order.client_id, name: 'Client inconnu' },
          product: product || { id: order.product_id, name: 'Produit inconnu' }
        };
      });
      
      // Remove duplicates by order ID in case any order appears in both responses
      const uniqueOrders = Array.from(new Map(enrichedOrders.map(order => [order.id, order])).values());
      
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
    // Reset form errors when opening dialog
    setFormErrors({
      order_ids: '',
      truck_id: '',
      scheduled_date: '',
      scheduled_time: '',
      destination: ''
    });
    
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

        const isExternal = delivery.is_external;
        const externalLabel = delivery.external_truck_label || '';

        setForm({
          order_ids: orderIds,
          truck_id: truckId,
          is_external: isExternal,
          external_truck_label: externalLabel,
          scheduled_date: scheduledDate,
          scheduled_time: delivery.scheduled_time || '',
          status: delivery.status || 'programmé',
          destination: delivery.destination || '',
          notes: delivery.notes || ''
        });
        setOrderQuantities(delivery.order_quantities || {});
        
        // If we have a truck ID, trigger capacity check
        if (delivery.truck_id && orderIds.length > 0) {
          checkTruckCapacity(delivery.truck_id, orderIds);
        }
      } else {
        console.log('Adding new delivery');
        setForm({
          order_ids: [],
          truck_id: '',
          is_external: false,
          external_truck_label: '',
          scheduled_date: new Date(),
          scheduled_time: '',
          status: 'programmé',
          destination: '',
          notes: ''
        });
        setOrderQuantities({});
        setTruckCapacity({ used: 0, total: 0, exceeded: false });
      }
    } catch (error) {
      console.error('Error in handleOpenDialog:', error);
      // Set default form state on error
      setForm({
        order_ids: [],
        truck_id: '',
        is_external: false,
        external_truck_label: '',
        scheduled_date: new Date(),
        scheduled_time: '',
        status: 'programmé'
      });
      setOrderQuantities({});
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
    if (!orderIds || !orderIds.length) return 0;

    const total = orderIds.reduce((sum, orderId) => {
      const qty = parseFloat(orderQuantities[orderId]);
      return isNaN(qty) ? sum : sum + qty;
    }, 0);
    
    console.log('Calculated total quantity:', { orderIds, total });
    return total;
  }, [orderQuantities]);

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
      
      // Show warning if capacity is exceeded
      if (exceeded) {
        setSnackbar({
          message: `Attention : La capacité du camion est dépassée (${totalQuantity.toFixed(1)}T > ${truckCapacityValue.toFixed(1)}T)`,
          severity: 'warning',
          autoHideDuration: 5000
        });
      }
      
      return newCapacity.exceeded;
    } catch (error) {
      console.error('Error in checkTruckCapacity:', error);
      setTruckCapacity({ used: 0, total: 0, exceeded: false });
      return false;
    }
  }, [dependencies.trucks, calculateTotalQuantity]);

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    let isValid = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Validate orders
    if (!form.order_ids || form.order_ids.length === 0) {
      errors.order_ids = 'Veuillez sélectionner au moins une commande';
      isValid = false;
    } else {
      // Validate quantities for each selected order
      form.order_ids.forEach(id => {
        const qty = parseFloat(orderQuantities[id]);
        const order = dependencies.orders.find(o => o.id === id);
        if (isNaN(qty) || qty <= 0) {
          errors.order_ids = 'Quantité invalide pour certaines commandes';
          isValid = false;
        } else if (order) {
          const scheduled = editDelivery?.order_quantities?.[id] ?? 0;
          const available = parseFloat(order.quantity) + parseFloat(scheduled);
          if (qty > available) {
            errors.order_ids = 'Quantité supérieure au disponible';
            isValid = false;
          }
        }
      });
    }
    
    // Validate truck
    if (!form.is_external && !form.truck_id) {
      errors.truck_id = 'Veuillez sélectionner un camion';
      isValid = false;
    }
    if (form.is_external && (!form.external_truck_label || form.external_truck_label.trim() === '')) {
      errors.truck_id = 'Veuillez préciser le camion externe';
      isValid = false;
    }
    
    // Validate date
    if (!form.scheduled_date) {
      errors.scheduled_date = 'Veuillez sélectionner une date';
      isValid = false;
    } else {
      const selectedDate = new Date(form.scheduled_date);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.scheduled_date = 'La date de livraison ne peut pas être dans le passé';
        isValid = false;
      }
    }
    
    // Validate time format if provided
    if (form.scheduled_time) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timeRegex.test(form.scheduled_time)) {
        errors.scheduled_time = 'Format d\'heure invalide. Utilisez le format HH:MM.';
        isValid = false;
      } else {
        // Check if time is in the past for today
        const selectedDate = new Date(form.scheduled_date);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate.getTime() === today.getTime()) {
          const [hours, minutes] = form.scheduled_time.split(':');
          const deliveryTime = new Date();
          deliveryTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          
          if (deliveryTime < new Date()) {
            errors.scheduled_time = 'L\'heure de livraison ne peut pas être dans le passé';
            isValid = false;
          }
        }
      }
    }
    
    // Validate destination
    if (!form.destination || form.destination.trim() === '') {
      errors.destination = 'Veuillez spécifier une destination';
      isValid = false;
    }
    
    setFormErrors(errors);
    return { valid: isValid, errors };
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
      // Validate form
      const { valid, errors } = validateForm();
      if (!valid) {
        // Show first error message
        const firstError = Object.values(errors).find(error => error);
        if (firstError) {
          setSnackbar({ 
            message: firstError, 
            severity: 'error',
            autoHideDuration: 5000
          });
        }
        return;
      }

      // For new deliveries, check if orders are already scheduled
      if (!editDelivery) {
        const orderValidation = await validateOrdersBeforeSave(form.order_ids);
        if (!orderValidation.valid) {
          setSnackbar({ 
            message: orderValidation.message,
            severity: 'warning',
            autoHideDuration: 10000
          });
          return;
        }
      }

      // Check truck capacity for internal trucks
      if (!form.is_external && form.truck_id && form.order_ids?.length > 0) {
        const isExceeded = await checkTruckCapacity(form.truck_id, form.order_ids);
        if (isExceeded) {
          setSnackbar({ 
            message: `La capacité du camion est dépassée (${truckCapacity.used.toFixed(1)}T > ${truckCapacity.total.toFixed(1)}T). Veuillez sélectionner un autre camion ou réduire la quantité de commandes.`, 
            severity: 'error',
            autoHideDuration: 10000
          });
          return;
        }
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
        status: form.status || 'programmé',
        destination: form.destination || '',
        notes: form.notes || ''
      };

      if (form.is_external) {
        payload.is_external = true;
        payload.external_truck_label = form.external_truck_label || '';
        payload.truck_id = null;
      }

      if (orderIds.length > 0) {
        payload.order_quantities = {};
        orderIds.forEach(id => {
          payload.order_quantities[id] = parseFloat(orderQuantities[id] || 0);
        });
      }
      
      // Handle truck_id - always include it in the payload when updating
      // Convert empty string to null for the backend
      if (!form.is_external) {
        if (editDelivery) {
          payload.truck_id = form.truck_id || null;
        } else if (form.truck_id) {
          payload.truck_id = form.truck_id;
        }
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
        is_external: false,
        external_truck_label: '',
        scheduled_date: new Date(),
        scheduled_time: '',
        status: 'programmé',
        destination: '',
        notes: ''
      });
      setOrderQuantities({});
      
    } catch (error) {
      console.error('Error saving delivery:', error);
      let errorMessage = 'Erreur lors de la sauvegarde de la livraison';
      
      // Handle specific error for truck capacity
      if (error.response?.data?.error === 'Truck capacity exceeded') {
        errorMessage = error.response.data.details || 'La capacité du camon est dépassée. Veuillez sélectionner un autre camion ou réduire la quantité de commandes.';
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
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
    
    // Reset error for the field being changed
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    
    // Special handling for time fields
    if (field === 'scheduled_time') {
      // If the value is a Date object from the time picker, format it to HH:MM
      if (value instanceof Date) {
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        value = `${hours}:${minutes}`;
      } else if (typeof value === 'string') {
        // Allow partial input (like "1" or "12:")
        if (value !== '' && !/^\d{0,2}:?\d{0,2}$/.test(value)) {
          console.warn('Invalid time format, expected HH:MM, got:', value);
          return;
        }
      }
      
      // Update the form with the new value
      setForm(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Validate time format when user finishes typing
      if (value && value.length >= 4) { // At least "12:3"
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(value)) {
          setFormErrors(prev => ({
            ...prev,
            scheduled_time: 'Format d\'heure invalide. Utilisez HH:MM.'
          }));
        }
      }
      return;
    }
    
    // Update form state with special handling for truck_id
    if (field === 'truck_id') {
      if (value === '__external__') {
        setForm(prev => ({
          ...prev,
          truck_id: '',
          is_external: true,
          external_truck_label: ''
        }));
      } else {
        setForm(prev => ({
          ...prev,
          truck_id: value,
          is_external: false,
          external_truck_label: ''
        }));
      }
    } else {
      setForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // For truck or order changes, trigger capacity check
    if ((field === 'truck_id' || field === 'order_ids') && value) {
      if (field === 'truck_id' && value !== '__external__' && form.order_ids?.length > 0) {
        checkTruckCapacity(value, form.order_ids);
      } else if (field === 'order_ids' && form.truck_id && !form.is_external) {
        checkTruckCapacity(form.truck_id, value);
      }
    }
  };

  const handleOrderSelect = async (event) => {
    const selectedIds = event.target.value;

    // Update form and clear any previous order errors
    setForm(prev => ({
      ...prev,
      order_ids: selectedIds
    }));

    // Initialize quantities for new selections and remove unselected ones
    setOrderQuantities(prev => {
      const updated = { ...prev };
      selectedIds.forEach(id => {
        if (!(id in updated)) {
          const order = dependencies.orders?.find(o => o.id === id);
          updated[id] = order ? order.quantity : '';
        }
      });
      Object.keys(updated).forEach(id => {
        if (!selectedIds.includes(id)) {
          delete updated[id];
        }
      });
      return updated;
    });
    
    // Clear order error if any
    if (formErrors.order_ids) {
      setFormErrors(prev => ({
        ...prev,
        order_ids: ''
      }));
    }
    
    // Check capacity in real-time when orders change
    if (form.truck_id && !form.is_external && selectedIds.length > 0) {
      await checkTruckCapacity(form.truck_id, selectedIds);
    } else {
      setTruckCapacity({ used: 0, total: 0, exceeded: false });
    }
  };

  const handleQuantityChange = (orderId, value) => {
    setOrderQuantities(prev => ({ ...prev, [orderId]: value }));

    if (form.truck_id && !form.is_external && form.order_ids?.length > 0) {
      checkTruckCapacity(form.truck_id, form.order_ids);
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

  const getOrderDetails = (orderId, scheduledQty) => {
    if (orderId == null) return 'ID de commande invalide';
    
    try {
      // Log available data for debugging
      console.log('getOrderDetails - orderId:', orderId);
      console.log('Available orders:', dependencies.orders?.length);
      console.log('Available clients:', dependencies.clients?.length);
      console.log('Available products:', dependencies.products?.length);
      
      // Find order by ID (convert both to string for comparison to handle number/string ID mismatches)
      const order = dependencies.orders?.find(o => o && String(o.id) === String(orderId));
      
      if (!order) {
        console.warn(`Order with ID ${orderId} not found in dependencies.orders`);
        console.warn('Available order IDs:', dependencies.orders?.map(o => o?.id));
        return `Commande ${orderId} (non trouvée)`;
      }
      
      console.log('Found order:', order);
      
      // Get client and product details (convert IDs to string for comparison)
      const client = dependencies.clients?.find(c => c && String(c.id) === String(order.client_id));
      const product = dependencies.products?.find(p => p && String(p.id) === String(order.product_id));
      
      console.log('Client match:', client);
      console.log('Product match:', product);
      
      // Format the order date and time
      const orderDate = order.requested_date ? new Date(order.requested_date) : null;
      const formattedDate = orderDate ? format(orderDate, 'dd/MM/yyyy', { locale: fr }) : 'Date inconnue';
      const formattedTime = order.requested_time ? order.requested_time.slice(0, 5) : ''; // Format as HH:MM
      
      // Format the order details with date and time
      const details = [
        client?.name || `Client inconnu (ID: ${order.client_id})`,
        `${scheduledQty != null ? scheduledQty : order.quantity || 0}T`,
        product?.name ? `de ${product.name}` : `Produit inconnu (ID: ${order.product_id})`,
        product?.type ? `(${product.type})` : '',
        `- ${formattedDate}`,
        formattedTime ? `à ${formattedTime}` : ''
      ].filter(Boolean).join(' ');
      
      return details;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      console.error('Error details:', { orderId, error: error.message });
      return `Commande ${orderId} (erreur d'affichage: ${error.message})`;
    }
  };
  
  const getTruckDetails = (delivery) => {
    if (delivery.is_external) {
      return delivery.external_truck_label || 'Transport externe';
    }
    const truck = dependencies.trucks?.find(t => t.id === delivery.truck_id);
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
                        <div key={orderId}>{getOrderDetails(orderId, delivery.order_quantities?.[orderId])}</div>
                      )) || 'Aucune commande'}
                    </TableCell>
                    <TableCell>{getTruckDetails(delivery)}</TableCell>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5
        }}>
          <Box>
            <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Historique de la livraison
          </Box>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={() => setHistoryDialogOpen(false)}
            size="small"
            sx={{
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, '&.MuiDialogContent-root': { py: 2 } }}>
          {selectedDelivery && selectedDelivery.history && selectedDelivery.history.length > 0 ? (
            <List disablePadding>
              {selectedDelivery.history.map((record, index) => {
                const statusColor = statusColors[record.status] || 'default';
                const prevStatus = selectedDelivery.history[index + 1]?.status;
                const isStatusChange = record.status !== prevStatus;
                const formattedDate = new Date(record.changed_at).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <React.Fragment key={record.id}>
                    <ListItem 
                      alignItems="flex-start"
                      sx={{
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'action.hover' },
                        py: 1.5,
                        px: 2
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 48, mt: 0.5 }}>
                        <Box sx={{ position: 'relative' }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: isStatusChange ? `${statusColor}.main` : 'grey.200',
                              color: isStatusChange ? `${statusColor}.contrastText` : 'grey.600',
                              width: 32,
                              height: 32,
                              fontSize: '0.75rem',
                              boxShadow: 1
                            }}
                          >
                            {record.changed_by ? record.changed_by.charAt(0).toUpperCase() : 'S'}
                          </Avatar>
                          {isStatusChange && (
                            <Box 
                              sx={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                bgcolor: `${statusColor}.main`,
                                color: `${statusColor}.contrastText`,
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                boxShadow: 1
                              }}
                            >
                              <SyncAltIcon fontSize="inherit" />
                            </Box>
                          )}
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                              <Chip 
                                label={record.status} 
                                size="small"
                                color={statusColor}
                                sx={{ 
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  '& .MuiChip-label': { px: 1, py: 0.5 },
                                  height: 22
                                }}
                              />
                              {isStatusChange && prevStatus && (
                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', fontSize: '0.75rem' }}>
                                  <ArrowForwardIcon fontSize="inherit" sx={{ mx: 0.5 }} />
                                  <Chip 
                                    label={prevStatus}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      height: 22,
                                      '& .MuiChip-label': { px: 1, py: 0.5 },
                                      fontSize: '0.7rem',
                                      bgcolor: 'background.paper'
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                            <Typography 
                              component="span" 
                              variant="caption" 
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                whiteSpace: 'nowrap',
                                bgcolor: 'background.default',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1
                              }}
                            >
                              {formattedDate}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <PersonOutlineIcon fontSize="small" color="action" />
                              <Typography 
                                variant="body2" 
                                color="text.primary"
                                sx={{ fontWeight: 500, fontSize: '0.85rem' }}
                              >
                                {record.changed_by || 'Système'}
                              </Typography>
                            </Box>
                            {record.notes && (
                              <Box 
                                sx={{
                                  mt: 1,
                                  p: 1.5,
                                  bgcolor: 'background.paper',
                                  borderRadius: 1,
                                  borderLeft: `3px solid ${statusColor === 'default' ? 'grey.400' : `${statusColor}.main`}`,
                                  fontSize: '0.85rem',
                                  lineHeight: 1.5
                                }}
                              >
                                {record.notes}
                              </Box>
                            )}
                          </Box>
                        }
                        sx={{ my: 0, '& .MuiListItemText-primary': { mb: 0.5 } }}
                      />
                    </ListItem>
                    {index < selectedDelivery.history.length - 1 && (
                      <Divider 
                        variant="inset" 
                        component="li" 
                        sx={{
                          mx: 0,
                          ml: '72px',
                          borderColor: 'divider',
                          my: 0.5
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              py: 4,
              textAlign: 'center'
            }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucun historique disponible
              </Typography>
              <Typography variant="body2" color="text.secondary">
                L'historique des modifications apparaîtra ici.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, id: null })}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment supprimer cette livraison ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation({ open: false, id: null })} color="inherit" disabled={isDeleting}>
            Annuler
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isDeleting}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Form Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5
        }}>
          <Box>
            <LocalShippingIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            {editDelivery ? 'Modifier la livraison' : 'Nouvelle livraison'}
          </Box>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={() => setDialogOpen(false)}
            size="small"
            sx={{
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ '&.MuiDialogContent-root': { py: 3 } }}>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth margin="normal" error={!!formErrors.order_ids}>
              <InputLabel id="order-select-label">Commandes *</InputLabel>
              <Select
                labelId="order-select-label"
                id="order-select"
                multiple
                value={form.order_ids || []}
                onChange={handleOrderSelect}
                label="Commandes *"
                disabled={isViewer}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((orderId) => {
                        const order = dependencies.orders?.find(o => o.id === orderId);
                        if (!order) return null;
                        const scheduled = editDelivery?.order_quantities?.[orderId] ?? 0;
                        const available = parseFloat(order.quantity) + parseFloat(scheduled);
                        return (
                          <Chip
                            key={orderId}
                            label={`${order.client?.name || 'Client inconnu'} - ${available}t`}
                          size="small"
                          sx={{ 
                            m: 0.5,
                            bgcolor: 'primary.lighter',
                            color: 'primary.dark',
                            '& .MuiChip-deleteIcon': {
                              color: 'primary.dark',
                              '&:hover': {
                                color: 'primary.main'
                              }
                            }
                          }}
                          onDelete={() => {
                            handleEditChange('order_ids', form.order_ids.filter(id => id !== orderId));
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      width: '100%',
                    },
                  },
                }}
              >
                {dependencies.orders
                  ?.filter(order => order.status === 'en attente' || order.status === 'validée')
                  .sort((a, b) => {
                    // Sort by client name, then by order date
                    const clientCompare = (a.client?.name || '').localeCompare(b.client?.name || '');
                    if (clientCompare !== 0) return clientCompare;
                    return new Date(b.requested_date) - new Date(a.requested_date);
                  })
                  .map((order) => {
                    const orderDate = order.requested_date 
                      ? new Date(order.requested_date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })
                      : 'Date inconnue';
                      
                    return (
                      <MenuItem key={order.id} value={order.id}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {order.client?.name || 'Client inconnu'}
                            </Typography>
                            <Chip
                              label={`${(parseFloat(order.quantity) + parseFloat(editDelivery?.order_quantities?.[order.id] ?? 0))}t`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 1, fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {order.product?.name || 'Produit inconnu'}
                              {order.product?.type && ` (${order.product.type})`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {orderDate}
                            </Typography>
                          </Box>
                          {order.notes && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                fontStyle: 'italic',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%'
                              }}
                            >
                              {order.notes}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
              </Select>
              {formErrors.order_ids && (
                <FormHelperText error>{formErrors.order_ids}</FormHelperText>
              )}
              {form.order_ids?.length > 0 && (
                <FormHelperText>
                  {`${form.order_ids.length} commande(s) sélectionnée(s)`}
                </FormHelperText>
              )}
              {form.order_ids?.map((oid) => {
                const order = dependencies.orders?.find(o => o.id === oid);
                if (!order) return null;
                return (
                  <Box key={oid} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {order.client?.name || 'Client'} - {order.product?.name || ''}
                    </Typography>
                    <TextField
                      label="Qté"
                      type="number"
                      size="small"
                      value={orderQuantities[oid] ?? ''}
                      onChange={(e) => handleQuantityChange(oid, e.target.value)}
                      inputProps={{
                        min: 0,
                        max: parseFloat(order.quantity) + parseFloat(editDelivery?.order_quantities?.[oid] ?? 0),
                        step: 0.1
                      }}
                      sx={{ width: 80 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      / {parseFloat(order.quantity) + parseFloat(editDelivery?.order_quantities?.[oid] ?? 0)}t
                    </Typography>
                  </Box>
                );
              })}
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="truck-select-label">Camion *</InputLabel>
              <Select
                labelId="truck-select-label"
                id="truck-select"
                value={form.truck_id || ''}
                onChange={(e) => handleEditChange('truck_id', e.target.value)}
                label="Camion *"
                disabled={isViewer}
                error={!!formErrors.truck_id}
              >
                <MenuItem value="">
                  <em>Sélectionner un camion</em>
                </MenuItem>
                <MenuItem value="__external__">
                  <em>-- Transport Externe --</em>
                </MenuItem>
                {dependencies.trucks?.map((truck) => (
                  <MenuItem key={truck.id} value={truck.id}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                          {truck.plate_number}
                        </Typography>
                        <Chip 
                          label={`${truck.capacity || 0}T`} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {truck.driver_name || 'Chauffeur non spécifié'}
                        {truck.phone_number && ` • ${truck.phone_number}`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {formErrors.truck_id && (
                <FormHelperText error>{formErrors.truck_id}</FormHelperText>
              )}
            </FormControl>

            {form.is_external && (
              <TextField
                label="Camion externe (plaque ou libellé)"
                fullWidth
                margin="normal"
                value={form.external_truck_label}
                onChange={(e) => handleEditChange('external_truck_label', e.target.value)}
                disabled={isViewer}
                error={!!formErrors.truck_id}
              />
            )}

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <DatePicker
                label="Date de livraison *"
                value={form.scheduled_date}
                onChange={(newValue) => handleEditChange('scheduled_date', newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth 
                    margin="normal" 
                    error={!!formErrors.scheduled_date}
                    helperText={formErrors.scheduled_date}
                  />
                )}
                minDate={new Date()}
                disabled={isViewer}
              />
            </LocalizationProvider>

            <TextField
              label="Heure de livraison *"
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
              error={!!formErrors.scheduled_time}
              helperText={formErrors.scheduled_time || 'Format: HH:MM (ex: 14:30)'}
            />

            <TextField
              label="Destination *"
              fullWidth
              margin="normal"
              value={form.destination || ''}
              onChange={(e) => handleEditChange('destination', e.target.value)}
              disabled={isViewer}
              error={!!formErrors.destination}
              helperText={formErrors.destination}
              required
            />

            <TextField
              label="Notes"
              fullWidth
              margin="normal"
              value={form.notes || ''}
              onChange={(e) => handleEditChange('notes', e.target.value)}
              multiline
              rows={3}
              disabled={isViewer}
              helperText="Informations complémentaires sur la livraison"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel id="status-select-label">Statut *</InputLabel>
              <Select
                labelId="status-select-label"
                id="status-select"
                value={form.status || 'programmé'}
                onChange={(e) => handleEditChange('status', e.target.value)}
                label="Statut *"
                disabled={isViewer}
                error={!!formErrors.status}
              >
                <MenuItem value="programmé">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="primary" fontSize="small" />
                    <span>Programmé</span>
                  </Box>
                </MenuItem>
                <MenuItem value="en cours">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShippingIcon color="info" fontSize="small" />
                    <span>En cours</span>
                  </Box>
                </MenuItem>
                <MenuItem value="livrée">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    <span>Livrée</span>
                  </Box>
                </MenuItem>
                <MenuItem value="annulée">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CancelIcon color="error" fontSize="small" />
                    <span>Annulée</span>
                  </Box>
                </MenuItem>
              </Select>
              {formErrors.status && (
                <FormHelperText error>{formErrors.status}</FormHelperText>
              )}
            </FormControl>

            {truckCapacity.total > 0 && (
              <Box mt={2} p={1.5} sx={{
                borderRadius: 1,
                bgcolor: truckCapacity.exceeded ? 'error.lighter' : 'success.lighter',
                border: `1px solid ${truckCapacity.exceeded ? 'error.light' : 'success.light'}`,
              }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" fontWeight={500} color={truckCapacity.exceeded ? 'error.dark' : 'success.dark'}>
                    Capacité du camion
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight={600} color={truckCapacity.exceeded ? 'error.main' : 'success.main'}>
                      {truckCapacity.used.toFixed(1)}T / {truckCapacity.total.toFixed(1)}T
                    </Typography>
                    {truckCapacity.exceeded && (
                      <Chip 
                        label="Dépassement" 
                        size="small" 
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
                {truckCapacity.exceeded && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    La capacité du camion est dépassée. Veuillez sélectionner un autre camion ou réduire le nombre de commandes.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            color="inherit"
            disabled={isSaving}
          >
            Annuler
          </Button>
          {!isViewer && (
            <Button 
              onClick={handleSave} 
              variant="contained" 
              color="primary"
              disabled={isSaving || (truckCapacity.exceeded && form.status !== 'annulée')}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ minWidth: 120 }}
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={snackbar?.autoHideDuration || 3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(null)} 
          severity={snackbar?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
