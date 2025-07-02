// src/components/SchedulePage.jsx
import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import api from '../services/api';
import {
  Box, Button, Typography, Paper, Snackbar, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, IconButton,
  Grid, Chip, Divider, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Loading from './Loading';

const tableStyles = {
  head: { background: "#F7F9FA" },
  row: {
    "&:nth-of-type(odd)": { background: "#FAFAFA" },
    "&:hover": { background: "#f0f4f9" }
  },
  cellBold: { fontWeight: "bold" }
};

export default function SchedulePage({ autoRefresh = false }) {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const isViewer = !isAdmin;
  const [schedule, setSchedule] = useState([]);
  const [scheduleStats, setScheduleStats] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [snackbar, setSnackbar] = useState(null);
  const [sortBy, setSortBy] = useState('order');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  // Auto-refresh data for viewers
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh) {
      // Refresh every 30 seconds
      intervalId = setInterval(() => {
        console.log('Auto-refreshing schedule data...');
        loadData();
      }, 30000);
    }
    
    // Initial data load
    loadData();
    
    // Cleanup interval on component unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  // Load schedule and stats from localStorage on component mount
  useEffect(() => {
    const savedSchedule = localStorage.getItem('deliverySchedule');
    
    if (savedSchedule) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (e) {
        console.error('Failed to parse saved schedule', e);
      }
    }
    
    // Load stats for all users
    const savedStats = localStorage.getItem('deliveryStats');
    if (savedStats) {
      try {
        setScheduleStats(JSON.parse(savedStats));
      } catch (e) {
        console.error('Failed to parse saved stats', e);
      }
    }
    
    loadData();
  }, []);

  // Save schedule and stats to localStorage whenever they change
  useEffect(() => {
    if (schedule.length > 0) {
      localStorage.setItem('deliverySchedule', JSON.stringify(schedule));
    } else {
      localStorage.removeItem('deliverySchedule');
    }
    
    if (scheduleStats) {
      localStorage.setItem('deliveryStats', JSON.stringify(scheduleStats));
    } else {
      localStorage.removeItem('deliveryStats');
    }
  }, [schedule, scheduleStats]);

  // Load all reference data
  const loadData = async (showNotification = true) => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const [trucksRes, ordersRes, clientsRes, productsRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/orders'),
        api.get('/clients'),
        api.get('/products')
      ]);
      setTrucks(trucksRes.data);
      setOrders(ordersRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
      if (showNotification) {
        setSnackbar({ 
          message: 'Données mises à jour', 
          severity: 'success',
          autoHideDuration: 2000
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadingError(error.message || 'Failed to load data');
      setSnackbar({ 
        message: 'Erreur lors du chargement des données', 
        severity: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };


  // Clear the current schedule
  const clearSchedule = () => {
    setSchedule([]);
    setScheduleStats(null);
    localStorage.removeItem('deliverySchedule');
    setSnackbar({
      message: 'Planning effacé',
      severity: 'info',
      autoHideDuration: 2000
    });
  };

  // Refresh data without clearing the schedule
  const handleRefresh = async () => {
    await loadData(true);
  };

  // Generate schedule
  const generate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.get('/schedule/deliveries');
      if (res.data.schedule) {
        setSchedule(res.data.schedule);
        setScheduleStats(res.data.stats || null);
        
        // Show warning if not all orders were scheduled
        if (res.data.stats && res.data.stats.total_pending_orders > res.data.stats.scheduled_orders) {
          const unscheduled = res.data.stats.total_pending_orders - res.data.stats.scheduled_orders;
          setSnackbar({ 
            message: `Planning généré avec succès, mais ${unscheduled} commande(s) non planifiée(s)`, 
            severity: 'warning',
            autoHideDuration: 5000
          });
        } else {
          setSnackbar({ 
            message: 'Planning généré avec succès', 
            severity: 'success',
            autoHideDuration: 3000
          });
        }
      } else {
        setSnackbar({ 
          message: 'Format de réponse inattendu du serveur', 
          severity: 'warning',
          autoHideDuration: 5000
        });
      }
    } catch (err) {
      console.error('Error generating schedule:', err);
      setSnackbar({ 
        message: `Erreur lors de la génération du planning: ${err.response?.data?.message || err.message || 'Erreur inconnue'}`, 
        severity: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to Excel
  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/schedule/export', { responseType: 'blob' });
      saveAs(res.data, `planning_livraisons_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSnackbar({ 
        message: 'Export Excel réussi', 
        severity: 'success',
        autoHideDuration: 3000
      });
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setSnackbar({ 
        message: `Erreur lors de l'export Excel: ${err.response?.data?.message || err.message || 'Erreur inconnue'}`,
        severity: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper: Get truck plate
  const getTruckPlate = (truckId) => {
    const truck = trucks.find(t => t.id === truckId);
    return truck ? truck.plate_number : truckId;
  };

  // Helper: parse order entries into detailed objects
  const parseDeliveries = (orderEntries) => {
    return orderEntries.map((entry, idx) => {
      const orderId = typeof entry === 'string' ? entry : entry.id;
      const qty = typeof entry === 'object' && entry !== null ? entry.quantity : null;
      const order = orders.find(o => o.id === orderId);
      const client = clients.find(c => c.id === order?.client_id);
      const product = products.find(p => p.id === order?.product_id);
      return {
        idx,
        clientName: client ? client.name : orderId,
        quantity: qty != null ? qty : order?.quantity,
        requestedDate: order?.requested_date,
        requestedTime: order?.requested_time?.slice(0,5) || '-',
        product: product ? `${product.name}${product.type ? ` (${product.type})` : ''}` : '',
        orderObj: order
      };
    });
  };

  // Aggregate deliveries into a single row
  const aggregateDeliveries = (orderEntries) => {
    const deliveries = parseDeliveries(orderEntries);
    if (deliveries.length === 0) return null;

    const clientParts = deliveries.map(d => `${d.clientName} ${d.quantity}T`);
    const totalQty = deliveries.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0);
    const productParts = [];
    deliveries.forEach(d => {
      if (d.product && !productParts.includes(d.product)) {
        productParts.push(d.product);
      }
    });

    return {
      clientName: clientParts.join(' - '),
      quantity: totalQty,
      product: productParts.join(' - '),
      requestedDate: deliveries[0].requestedDate,
      requestedTime: deliveries[0].requestedTime
    };
  };

  // Sort the entire planning (schedule array) based on sortBy
  const getSortedSchedule = () => {
    if (sortBy === 'order') {
      return schedule;
    }
    const sorted = [...schedule];
    if (sortBy === 'time') {
      sorted.sort((a, b) => {
        const aDeliveries = parseDeliveries(a.orders);
        const bDeliveries = parseDeliveries(b.orders);
        // Combine date and time for full chronological sorting
        const aDate = aDeliveries[0]?.requestedDate || '';
        const bDate = bDeliveries[0]?.requestedDate || '';
        const aTime = aDeliveries[0]?.requestedTime || '';
        const bTime = bDeliveries[0]?.requestedTime || '';
        // ISO format: 'YYYY-MM-DDTHH:MM' for correct string comparison
        const aDateTime = aDate && aTime ? `${aDate}T${aTime}` : '';
        const bDateTime = bDate && bTime ? `${bDate}T${bTime}` : '';
        return aDateTime.localeCompare(bDateTime);
      });
    } else if (sortBy === 'client') {
      sorted.sort((a, b) => {
        const aDeliveries = parseDeliveries(a.orders);
        const bDeliveries = parseDeliveries(b.orders);
        const aName = aDeliveries[0]?.clientName || '';
        const bName = bDeliveries[0]?.clientName || '';
        return aName.localeCompare(bName);
      });
    }
    return sorted;
  };


  // Show loading state
  if (isLoading && schedule.length === 0) {
    return <Loading message="Chargement des données..." />;
  }

  // Show error state
  if (loadingError) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" gutterBottom>
          Erreur de chargement
        </Typography>
        <Typography color="textSecondary" paragraph>
          {loadingError}
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={loadData}
          startIcon={<RefreshIcon />}
        >
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" component="h2" sx={{ display: 'inline', mr: 2 }}>
              Planning de livraison
            </Typography>
            {isViewer && autoRefresh && (
              <Chip 
                label="Mise à jour automatique" 
                size="small" 
                color="info"
                variant="outlined"
              />
            )}
          </Box>
          <Box>
            <IconButton 
              onClick={loadData} 
              color="primary"
              disabled={isLoading || isGenerating}
              title="Rafraîchir les données"
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
            {isAdmin && (
              <>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={generate}
                  disabled={isLoading || isGenerating}
                  startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{ mr: 1 }}
                >
                  {isGenerating ? 'Génération...' : 'Générer le planning'}
                </Button>
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={clearSchedule}
                  disabled={isLoading || isGenerating || schedule.length === 0}
                >
                  Effacer le planning
                </Button>
              </>
            )}
            <Button 
              variant="outlined" 
              onClick={exportExcel} 
              disabled={isLoading || isExporting || schedule.length === 0}
              startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ ml: isAdmin ? 1 : 0 }}
            >
              {isExporting ? 'Export en cours...' : 'Exporter en Excel'}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }} disabled={isLoading}>
          <InputLabel>Trier par</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Trier par"
          >
            <MenuItem value="order">Ordre d'affectation</MenuItem>
            <MenuItem value="time">Date de livraison</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </Select>
        </FormControl>
        <Typography color="textSecondary" variant="body2">
          {schedule.filter(item => item.orders && item.orders.length > 0).length} camion{schedule.filter(item => item.orders && item.orders.length > 0).length !== 1 ? 's' : ''} avec livraison{schedule.filter(item => item.orders && item.orders.length > 0).length !== 1 ? 's' : ''} planifiée{schedule.filter(item => item.orders && item.orders.length > 0).length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Schedule Stats */}
      {scheduleStats && (
        <Paper elevation={2} sx={{ mb: 3, p: 2, backgroundColor: '#f9f9f9' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="textSecondary">Limite de production</Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="h6" color={scheduleStats.total_pending_quantity > scheduleStats.daily_limit ? 'error' : 'primary'}>
                  {scheduleStats.daily_limit.toLocaleString()} tonnes
                </Typography>
                {scheduleStats.total_pending_quantity > scheduleStats.daily_limit && (
                  <Tooltip title={`Dépassement de ${(scheduleStats.total_pending_quantity - scheduleStats.daily_limit).toLocaleString()} tonnes`}>
                    <Chip 
                      label={`+${((scheduleStats.total_pending_quantity / scheduleStats.daily_limit - 1) * 100).toFixed(0)}%`} 
                      color="error" 
                      size="small" 
                      sx={{ ml: 1, fontWeight: 'bold' }}
                    />
                  </Tooltip>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" color="textSecondary">Commandes</Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="h6">
                  {scheduleStats.scheduled_orders}
                  <Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 0.5 }}>
                    / {scheduleStats.total_pending_orders}
                  </Typography>
                </Typography>
                {scheduleStats.scheduled_orders < scheduleStats.total_pending_orders && (
                  <Chip 
                    label={`${scheduleStats.total_pending_orders - scheduleStats.scheduled_orders} non planifiées`} 
                    color="warning" 
                    size="small" 
                    variant="outlined"
                    sx={{ ml: 1, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" color="textSecondary">Quantité totale</Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="h6">
                  {scheduleStats.scheduled_quantity.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  <Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 0.5 }}>
                    / {scheduleStats.total_pending_quantity.toLocaleString(undefined, { maximumFractionDigits: 1 })} t
                  </Typography>
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" color="textSecondary">Camions utilisés</Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="h6">
                  {scheduleStats.trucks_utilized}
                  <Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 0.5 }}>
                    / {scheduleStats.total_trucks} disponibles
                  </Typography>
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="subtitle2" color="textSecondary">Capacité totale</Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="h6">
                  {scheduleStats.total_capacity.toLocaleString()} t
                </Typography>
                {scheduleStats.scheduled_quantity > 0 && (
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                    ({((scheduleStats.scheduled_quantity / scheduleStats.total_capacity) * 100).toFixed(0)}% utilisé)
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Pretty planning table */}
      {schedule.length > 0 && (
        <Paper sx={{ mt: 3, p: 2, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Affectations par camion</Typography>
          <TableContainer>
            <Table>
              <TableHead style={tableStyles.head}>
                <TableRow>
                  <TableCell style={tableStyles.cellBold}>Client</TableCell>
                  <TableCell style={tableStyles.cellBold}>Quantité (t)</TableCell>
                  <TableCell style={tableStyles.cellBold}>Produit</TableCell>
                  <TableCell style={tableStyles.cellBold}>Date</TableCell>
                  <TableCell style={tableStyles.cellBold}>Heure</TableCell>
                  <TableCell style={tableStyles.cellBold}>Camion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedSchedule().map((item, idx) => {
                  const aggregated = aggregateDeliveries(item.orders);
                  return !aggregated ? (
                    <TableRow key={idx}>
                      <TableCell colSpan={6} align="center">Aucune livraison</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={idx} style={tableStyles.row}>
                      <TableCell>{aggregated.clientName}</TableCell>
                      <TableCell>{aggregated.quantity}</TableCell>
                      <TableCell>{aggregated.product}</TableCell>
                      <TableCell>{aggregated.requestedDate}</TableCell>
                      <TableCell>{aggregated.requestedTime}</TableCell>
                      <TableCell>{getTruckPlate(item.truck)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={snackbar?.autoHideDuration || 3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(null)} 
          severity={snackbar?.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
