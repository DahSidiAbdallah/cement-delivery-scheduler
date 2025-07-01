// src/components/TrucksPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import api from '../services/api';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [plate, setPlate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [driver, setDriver] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ plate_number: '', capacity: '', driver_name: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    try {
      const response = await api.get('/trucks');
      setTrucks(response.data);
    } catch (error) {
      console.error('Error loading trucks:', error);
      setSnackbar({ message: 'Erreur lors du chargement des camions', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleAdd = async () => {
    if (!plate.trim() || !capacity || !driver.trim()) {
      setSnackbar({ message: 'Tous les champs sont requis', severity: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/trucks', {
        plate_number: plate,
        capacity: parseFloat(capacity),
        driver_name: driver
      });
      setPlate(''); 
      setCapacity(''); 
      setDriver('');
      await load();
      setSnackbar({ message: 'Camion ajouté', severity: 'success' });
    } catch (error) {
      console.error('Error adding truck:', error);
      setSnackbar({ message:'Erreur lors de l\'ajout du camion', severity:'error' });
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await api.delete(`/trucks/${id}`);
      setSnackbar({ message: 'Camion supprimé', severity: 'success' });
      setDeleteId(null);
      await load();
    } catch (error) {
      console.error('Error deleting truck:', error);
      setSnackbar({ message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleEditOpen = (truck) => {
    setEditData({
      plate_number: truck.plate_number,
      capacity: truck.capacity.toString(),
      driver_name: truck.driver_name || ''
    });
    setEditId(truck.id);
  };
  
  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditSave = async () => {
    if (!editData.plate_number?.trim() || !editData.capacity || !editData.driver_name?.trim()) {
      setSnackbar({ message: 'Tous les champs sont requis', severity: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await api.put(`/trucks/${editId}`, {
        plate_number: editData.plate_number.trim(),
        capacity: parseFloat(editData.capacity),
        driver_name: editData.driver_name.trim()
      });
      setSnackbar({ message: 'Camion modifié', severity: 'success' });
      setEditId(null);
      await load();
    } catch (error) {
      console.error('Error updating truck:', error);
      setSnackbar({ 
        message: error.response?.data?.message || 'Erreur lors de la modification', 
        severity: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Camions</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField 
          label="Immatriculation" 
          value={plate}
          onChange={e => setPlate(e.target.value)} 
          size="small"
          disabled={isSaving}
        />
        <TextField 
          label="Capacité (tonnes)" 
          value={capacity}
          type="number" 
          onChange={e => setCapacity(e.target.value)} 
          size="small"
          inputProps={{ min: 0, step: 0.01 }}
          disabled={isSaving}
        />
        <TextField 
          label="Chauffeur" 
          value={driver}
          onChange={e => setDriver(e.target.value)} 
          size="small"
          disabled={isSaving}
        />
        <Button 
          variant="contained" 
          onClick={handleAdd}
          disabled={isSaving || !plate.trim() || !capacity || !driver.trim()}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
        >
          {isSaving ? 'Ajout...' : 'Ajouter'}
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : trucks.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                Aucun camion enregistré
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Immatriculation</TableCell>
                  <TableCell>Capacité (tonnes)</TableCell>
                  <TableCell>Chauffeur</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trucks.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.plate_number}</TableCell>
                    <TableCell>{t.capacity}</TableCell>
                    <TableCell>{t.driver_name}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={() => handleEditOpen(t)}
                        disabled={isDeleting}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => setDeleteId(t.id)}
                        disabled={isDeleting}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
        <DialogTitle>Supprimer le camion ?</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce camion ?</DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteId(null)}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button 
            color="error" 
            onClick={() => handleDelete(deleteId)}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editId} onClose={() => !isSaving && setEditId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Modifier le camion</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField 
              label="Immatriculation" 
              value={editData.plate_number} 
              onChange={e => handleEditChange('plate_number', e.target.value)} 
              fullWidth 
              sx={{ mb: 2 }} 
              disabled={isSaving}
            />
            <TextField 
              label="Capacité (tonnes)" 
              type="number" 
              value={editData.capacity} 
              onChange={e => handleEditChange('capacity', e.target.value)} 
              fullWidth 
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 0.01 }}
              disabled={isSaving}
            />
            <TextField 
              label="Chauffeur" 
              value={editData.driver_name} 
              onChange={e => handleEditChange('driver_name', e.target.value)} 
              fullWidth
              disabled={isSaving}
            />
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
            disabled={isSaving || !editData.plate_number?.trim() || !editData.capacity || !editData.driver_name?.trim()}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
