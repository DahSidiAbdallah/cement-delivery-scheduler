// src/components/SchedulePage.jsx
import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import api from '../services/api';
import {
  Box, Button, Typography, Paper,
  List, ListItem, Snackbar, Alert
} from '@mui/material';

export default function SchedulePage() {
  const [schedule, setSchedule]   = useState([]);
  const [snackbar, setSnackbar]   = useState(null);

  const generate = async () => {
    console.log('▶️ Générer le planning cliqué');
    try {
      const res = await api.get('/schedule/deliveries');
      console.log('✅ Réponse du planning:', res);
      if (res.data.schedule) {
        setSchedule(res.data.schedule);
        setSnackbar({ message: 'Planning généré', severity: 'success' });
      } else {
        console.warn('⚠️ Champ `schedule` manquant dans la réponse:', res.data);
        setSnackbar({ message: 'Format de réponse inattendu', severity: 'warning' });
      }
    } catch (err) {
      console.error('❌ Erreur lors de la génération du planning:', err);
      const msg = err.response?.data?.message
        || err.message
        || 'Erreur inconnue';
      setSnackbar({ message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Planning des livraisons
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={generate}>
          Générer le planning
        </Button>
        <Button
          variant="outlined"
          onClick={async () => {
            try {
              const res = await api.get('/schedule/export', { responseType: 'blob' });
              saveAs(res.data, 'planning_livraisons.xlsx');
            } catch (err) {
              setSnackbar({ message: 'Erreur lors de l\'export Excel', severity: 'error' });
            }
          }}
        >
          Exporter en Excel
        </Button>
      </Box>

      {/* Affichage du planning */}
      {schedule.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6">Affectations</Typography>
          <List>
            {schedule.map((item, idx) => (
              <ListItem key={idx}>
                <strong>Camion :</strong> {item.truck} &nbsp; 
                <strong>Commandes :</strong> {item.orders.join(', ')}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Feedback */}
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
