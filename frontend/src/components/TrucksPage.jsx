// src/components/TrucksPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import {
  DataGrid
} from '@mui/x-data-grid';
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

export default function TrucksPage() {
  const [trucks, setTrucks]     = useState([]);
  const [plate, setPlate]       = useState('');
  const [capacity, setCapacity] = useState('');
  const [driver, setDriver]     = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ plate_number: '', capacity: '', driver_name: '' });

  const load = () => api.get('/trucks').then(r => setTrucks(r.data));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!plate.trim() || !capacity || !driver.trim()) {
      setSnackbar({ message: 'Tous les champs sont requis', severity: 'error' });
      return;
    }
    try {
      await api.post('/trucks', {
        plate_number: plate,
        capacity,
        driver_name: driver
      });
      setPlate(''); setCapacity(''); setDriver('');
      load();
      setSnackbar({ message:'Camion ajouté', severity:'success' });
    } catch {
      setSnackbar({ message:'Erreur lors de l\'ajout du camion', severity:'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/trucks/${id}`);
      setSnackbar({ message: 'Camion supprimé', severity: 'success' });
      setDeleteId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleEditOpen = (truck) => {
    setEditId(truck.id);
    setEditData({
      plate_number: truck.plate_number,
      capacity: truck.capacity,
      driver_name: truck.driver_name
    });
  };

  const handleEditSave = async () => {
    if (!editData.plate_number.trim() || !editData.capacity || !editData.driver_name.trim()) {
      setSnackbar({ message: 'Tous les champs sont requis', severity: 'error' });
      return;
    }
    try {
      await api.put(`/trucks/${editId}`, editData);
      setSnackbar({ message: 'Camion modifié', severity: 'success' });
      setEditId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la modification', severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Camions</Typography>
      <Box sx={{ display:'flex', mb:2 }}>
        <TextField label="Immatriculation" value={plate}
          onChange={e=>setPlate(e.target.value)} sx={{ mr:2 }} />
        <TextField label="Capacité" value={capacity}
          type="number" onChange={e=>setCapacity(e.target.value)} sx={{ mr:2 }} />
        <TextField label="Chauffeur" value={driver}
          onChange={e=>setDriver(e.target.value)} sx={{ mr:2 }} />
        <Button variant="contained" onClick={handleAdd}>Ajouter</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Immatriculation</TableCell>
                <TableCell>Capacité</TableCell>
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
                    <IconButton color="primary" size="small" onClick={() => handleEditOpen(t)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => setDeleteId(t.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={()=>setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
      />
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Supprimer le camion ?</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce camion ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" onClick={() => handleDelete(deleteId)}>Supprimer</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editId} onClose={() => setEditId(null)}>
        <DialogTitle>Modifier le camion</DialogTitle>
        <DialogContent>
          <TextField label="Immatriculation" value={editData.plate_number} onChange={e=>setEditData({...editData, plate_number:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Capacité" type="number" value={editData.capacity} onChange={e=>setEditData({...editData, capacity:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Chauffeur" value={editData.driver_name} onChange={e=>setEditData({...editData, driver_name:e.target.value})} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Annuler</Button>
          <Button onClick={handleEditSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
