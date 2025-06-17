// src/components/SchedulePage.jsx
import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import api from '../services/api';
import {
  Box, Button, Typography, Paper, Snackbar, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, IconButton
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

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([]);
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

  // Load all reference data
  const loadData = async () => {
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

  useEffect(() => {
    loadData();
  }, []);

  // Generate schedule
  const generate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.get('/schedule/deliveries');
      if (res.data.schedule) {
        setSchedule(res.data.schedule);
        setSnackbar({ 
          message: 'Planning généré avec succès', 
          severity: 'success',
          autoHideDuration: 3000
        });
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

  // Helper: Compose delivery rows (with extra info)
  const renderDeliveries = (orderIds) => {
    // Build array of enriched deliveries for this truck
    const deliveries = orderIds.map((orderId, idx) => {
      const order = orders.find(o => o.id === orderId);
      const client = clients.find(c => c.id === order?.client_id);
      const product = products.find(p => p.id === order?.product_id);
      return {
        idx,
        clientName: client ? client.name : orderId,
        quantity: order?.quantity,
        requestedDate: order?.requested_date,
        requestedTime: order?.requested_time?.slice(0,5) || '-', // "HH:MM"
        product: product ? `${product.name}${product.type ? ` (${product.type})` : ''}` : '',
        orderObj: order
      };
    });

    // Optional: sort deliveries by time or client
    if (sortBy === 'time') {
      deliveries.sort((a, b) => (a.requestedTime > b.requestedTime ? 1 : -1));
    } else if (sortBy === 'client') {
      deliveries.sort((a, b) => a.clientName.localeCompare(b.clientName));
    }
    // Default: order as per assignment (idx)

    return deliveries;
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
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Planning des livraisons</Typography>
        <Box display="flex" gap={2}>
          <IconButton 
            onClick={loadData} 
            color="primary"
            disabled={isLoading}
            title="Rafraîchir les données"
          >
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={generate}
            disabled={isLoading || isGenerating}
            startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isGenerating ? 'Génération...' : 'Générer le planning'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={exportExcel} 
            disabled={isLoading || isExporting || schedule.length === 0}
            startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isExporting ? 'Export en cours...' : 'Exporter en Excel'}
          </Button>
        </Box>
      </Box>

      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }} disabled={isLoading}>
          <InputLabel>Trier par</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Trier par"
          >
            <MenuItem value="order">Ordre d'affectation</MenuItem>
            <MenuItem value="time">Heure de livraison</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </Select>
        </FormControl>
        <Typography color="textSecondary" variant="body2">
          {schedule.length} livraison{schedule.length !== 1 ? 's' : ''} planifiée{schedule.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Pretty planning table */}
      {schedule.length > 0 && (
        <Paper sx={{ mt: 3, p: 2, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Affectations par camion</Typography>
          <TableContainer>
            <Table>
              <TableHead style={tableStyles.head}>
                <TableRow>
                  <TableCell style={tableStyles.cellBold}>Camion</TableCell>
                  <TableCell style={tableStyles.cellBold}>#</TableCell>
                  <TableCell style={tableStyles.cellBold}>Client</TableCell>
                  <TableCell style={tableStyles.cellBold}>Quantité (t)</TableCell>
                  <TableCell style={tableStyles.cellBold}>Date</TableCell>
                  <TableCell style={tableStyles.cellBold}>Heure</TableCell>
                  <TableCell style={tableStyles.cellBold}>Produit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedule.map((item, idx) => {
                  const deliveries = renderDeliveries(item.orders);
                  // Separate row for each delivery, but only show truck for the first row
                  return deliveries.length === 0 ? (
                    <TableRow key={idx}>
                      <TableCell>{getTruckPlate(item.truck)}</TableCell>
                      <TableCell colSpan={6} align="center">Aucune livraison</TableCell>
                    </TableRow>
                  ) : deliveries.map((d, i) => (
                    <TableRow key={i} style={tableStyles.row}>
                      {i === 0 ? (
                        <TableCell rowSpan={deliveries.length} style={{ verticalAlign: 'top', fontWeight: 600 }}>
                          {getTruckPlate(item.truck)}
                        </TableCell>
                      ) : null}
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{d.clientName}</TableCell>
                      <TableCell>{d.quantity}</TableCell>
                      <TableCell>{d.requestedDate}</TableCell>
                      <TableCell>{d.requestedTime}</TableCell>
                      <TableCell>{d.product}</TableCell>
                    </TableRow>
                  ));
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
