// src/components/ProductsPage.jsx
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

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [name, setName]         = useState('');
  const [type, setType]         = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: '', type: '' });

  const load = () => api.get('/products').then(r => setProducts(r.data));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) {
      setSnackbar({ message: 'Le nom du produit est requis', severity: 'error' });
      return;
    }
    try {
      await api.post('/products', { name, type });
      setName(''); setType('');
      load();
      setSnackbar({ message:'Produit ajouté', severity:'success' });
    } catch {
      setSnackbar({ message:'Erreur lors de l\'ajout du produit', severity:'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setSnackbar({ message: 'Produit supprimé', severity: 'success' });
      setDeleteId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleEditOpen = (product) => {
    setEditId(product.id);
    setEditData({
      name: product.name,
      type: product.type || ''
    });
  };

  const handleEditSave = async () => {
    if (!editData.name.trim()) {
      setSnackbar({ message: 'Le nom du produit est requis', severity: 'error' });
      return;
    }
    try {
      await api.put(`/products/${editId}`, editData);
      setSnackbar({ message: 'Produit modifié', severity: 'success' });
      setEditId(null);
      load();
    } catch {
      setSnackbar({ message: 'Erreur lors de la modification', severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Produits</Typography>
      <Box sx={{ display:'flex', mb:2 }}>
        <TextField
          label="Nom" value={name}
          onChange={e=>setName(e.target.value)}
          sx={{ mr:2 }}
        />
        <TextField
          label="Type" value={type}
          onChange={e=>setType(e.target.value)}
          sx={{ mr:2 }}
        />
        <Button variant="contained" onClick={handleAdd}>Ajouter</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.type || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" size="small" onClick={() => handleEditOpen(p)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => setDeleteId(p.id)}>
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
        <DialogTitle>Supprimer le produit ?</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce produit ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" onClick={() => handleDelete(deleteId)}>Supprimer</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editId} onClose={() => setEditId(null)}>
        <DialogTitle>Modifier le produit</DialogTitle>
        <DialogContent>
          <TextField label="Nom" value={editData.name} onChange={e=>setEditData({...editData, name:e.target.value})} fullWidth sx={{mb:2}} />
          <TextField label="Type" value={editData.type} onChange={e=>setEditData({...editData, type:e.target.value})} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Annuler</Button>
          <Button onClick={handleEditSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
