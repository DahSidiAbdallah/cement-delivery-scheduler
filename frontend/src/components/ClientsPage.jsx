// src/components/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PeopleIcon from '@mui/icons-material/People';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: '', address: '', priority_level: 1, contact_info: '' });

  const load = async () => {
    try {
      console.log('🔄 Attempting to load clients...');
      const response = await api.get('/clients');
      console.log('✅ Clients loaded successfully:', response.data);
      setClients(response.data);
    } catch (error) {
      console.error('❌ Error loading clients:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.status === 401 
        ? 'Authentication failed - please log in again' 
        : `Error loading clients: ${error.response?.status || 'Network error'}`;
        
      setSnackbar({ message: errorMessage, severity: 'error' });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    console.log('Token check on mount:', token ? 'EXISTS' : 'MISSING');
    
    if (token) {
      load();
    } else {
      setSnackbar({ message: 'Please log in first', severity: 'error' });
    }
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) {
      setSnackbar({ message: 'Le nom du client est requis', severity: 'error' });
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setSnackbar({ message: 'Please log in first', severity: 'error' });
      return;
    }

    try {
      await api.post('/clients', { name, priority_level: 1 });
      setName('');
      load();
      setSnackbar({ message: 'Client added', severity: 'success' });
    } catch (error) {
      console.error('Error adding client:', error);
      setSnackbar({ message: 'Error adding client', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/clients/${id}`);
      setSnackbar({ message: 'Client supprimé', severity: 'success' });
      setDeleteId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleEditOpen = (client) => {
    setEditId(client.id);
    setEditData({
      name: client.name,
      address: client.address || '',
      priority_level: client.priority_level,
      contact_info: client.contact_info || ''
    });
  };

  const handleEditSave = async () => {
    if (!editData.name.trim()) {
      setSnackbar({ message: 'Le nom du client est requis', severity: 'error' });
      return;
    }

    try {
      await api.put(`/clients/${editId}`, editData);
      setSnackbar({ message: 'Client modifié', severity: 'success' });
      setEditId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la modification', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PeopleIcon color="primary" sx={{ fontSize: 36, mr: 1 }} />
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>Clients</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display:'flex', mb:2, gap:2 }}>
        <TextField
          label="Nom du client"
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ flex:1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonAddAlt1Icon color="action" />
              </InputAdornment>
            )
          }}
        />
        <Button variant="contained" color="primary" size="large" onClick={handleAdd} sx={{ fontWeight: 600, px: 4 }}>
          Ajouter
        </Button>
      </Box>
      <Paper sx={{ mt: 2, p: 2, borderRadius: 2, boxShadow: 1, background: '#f5f7fa' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          Liste des clients
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Adresse</TableCell>
                <TableCell>Priorité</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.address || '-'}</TableCell>
                  <TableCell>{c.priority_level}</TableCell>
                  <TableCell>{c.contact_info || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" size="small" onClick={() => handleEditOpen(c)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => setDeleteId(c.id)}>
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
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Supprimer le client ?</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce client ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" onClick={() => handleDelete(deleteId)}>Supprimer</Button>
        </DialogActions>
      </Dialog>
      {/* Edit dialog */}
      <Dialog open={!!editId} onClose={() => setEditId(null)}>
        <DialogTitle>Modifier le client</DialogTitle>
        <DialogContent>
          <TextField label="Nom" value={editData.name} onChange={e=>setEditData({...editData, name:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Adresse" value={editData.address} onChange={e=>setEditData({...editData, address:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Contact" value={editData.contact_info} onChange={e=>setEditData({...editData, contact_info:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Priorité" type="number" value={editData.priority_level} onChange={e=>setEditData({...editData, priority_level:e.target.value})} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Annuler</Button>
          <Button onClick={handleEditSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}