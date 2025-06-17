// src/components/SchedulePage.jsx
import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import api from '../services/api';
import {
  Box, Button, Typography, Paper, Snackbar, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [snackbar, setSnackbar] = useState(null);
  const [sortBy, setSortBy] = useState('order'); // Sort deliveries by order (default), time, or client

  // Fetch reference data on mount
  useEffect(() => {
    api.get('/trucks').then(r => setTrucks(r.data));
    api.get('/orders').then(r => setOrders(r.data));
    api.get('/clients').then(r => setClients(r.data));
    api.get('/products').then(r => setProducts(r.data));
  }, []);

  // Generate schedule
  const generate = async () => {
    try {
      const res = await api.get('/schedule/deliveries');
      if (res.data.schedule) {
        setSchedule(res.data.schedule);
        setSnackbar({ message: 'Planning généré', severity: 'success' });
      } else {
        setSnackbar({ message: 'Format de réponse inattendu', severity: 'warning' });
      }
    } catch (err) {
      setSnackbar({ message: err.response?.data?.message || err.message || 'Erreur inconnue', severity: 'error' });
    }
  };

  // Export to Excel
  const exportExcel = async () => {
    try {
      const res = await api.get('/schedule/export', { responseType: 'blob' });
      saveAs(res.data, 'planning_livraisons.xlsx');
    } catch (err) {
      setSnackbar({ message: 'Erreur lors de l\'export Excel', severity: 'error' });
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Planning des livraisons</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={generate}>Générer le planning</Button>
        <Button variant="outlined" onClick={exportExcel}>Exporter en Excel</Button>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="sort-by-label">Trier par</InputLabel>
          <Select
            labelId="sort-by-label"
            value={sortBy}
            label="Trier par"
            onChange={e => setSortBy(e.target.value)}
          >
            <MenuItem value="order">Ordre d'affectation</MenuItem>
            <MenuItem value="time">Heure</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Pretty planning table */}
      {schedule.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Affectations par camion</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><b>Camion</b></TableCell>
                  <TableCell><b>#</b></TableCell>
                  <TableCell><b>Client</b></TableCell>
                  <TableCell><b>Quantité (t)</b></TableCell>
                  <TableCell><b>Date</b></TableCell>
                  <TableCell><b>Heure</b></TableCell>
                  <TableCell><b>Produit</b></TableCell>
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
                    <TableRow key={i}>
                      {i === 0 ? (
                        <TableCell rowSpan={deliveries.length} sx={{ verticalAlign: 'top', fontWeight: 600 }}>
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
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar && (
          <Alert
            onClose={() => setSnackbar(null)}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
