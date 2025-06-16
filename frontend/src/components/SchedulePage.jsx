// src/components/SchedulePage.jsx
import React, { useState } from 'react';
import api from '../services/api';
import {
  Box, Button, Typography, Paper,
  List, ListItem, Snackbar, Alert
} from '@mui/material';

export default function SchedulePage() {
  const [schedule, setSchedule]   = useState([]);
  const [snackbar, setSnackbar]   = useState(null);

  const generate = async () => {
    console.log('▶️ Generate button clicked');
    try {
      const res = await api.get('/schedule/deliveries');
      console.log('✅ Schedule response:', res);
      if (res.data.schedule) {
        setSchedule(res.data.schedule);
        setSnackbar({ message: 'Schedule generated', severity: 'success' });
      } else {
        console.warn('⚠️ No `schedule` field in response:', res.data);
        setSnackbar({ message: 'Unexpected response format', severity: 'warning' });
      }
    } catch (err) {
      console.error('❌ Error generating schedule:', err);
      const msg = err.response?.data?.message
        || err.message
        || 'Unknown error';
      setSnackbar({ message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Delivery Schedule
      </Typography>
      <Button variant="contained" onClick={generate}>
        Generate Schedule
      </Button>

      {/* Show schedule items */}
      {schedule.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6">Assignments</Typography>
          <List>
            {schedule.map((item, idx) => (
              <ListItem key={idx}>
                <strong>Truck:</strong> {item.truck} &nbsp; 
                <strong>Orders:</strong> {item.orders.join(', ')}
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
