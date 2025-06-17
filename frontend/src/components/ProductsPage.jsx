// src/components/ProductsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Snackbar, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';
import Loading from './Loading';

const tableStyles = {
  head: { background: "#F7F9FA" },
  row: {
    "&:nth-of-type(odd)": { background: "#FAFAFA" },
    "&:hover": { background: "#f0f4f9" }
  },
  cellBold: { fontWeight: "bold" }
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', type: '' });

  const [deleteProductId, setDeleteProductId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to load products:", error);
      setLoadingError(error.message || "Une erreur est survenue lors du chargement des produits.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnackbar({ message: 'Le nom du produit est requis', severity: 'warning' });
      return;
    }
    setIsSaving(true);
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, form);
        setSnackbar({ message: "Produit modifié avec succès", severity: "success" });
      } else {
        await api.post('/products', form);
        setSnackbar({ message: "Produit ajouté avec succès", severity: "success" });
      }
      setDialogOpen(false);
      setEditProduct(null);
      setForm({ name: '', type: '' });
      await load();
    } catch (e) {
      console.error("Failed to save product:", e);
      setSnackbar({ message: e.response?.data?.message || "Erreur lors de la sauvegarde du produit", severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProductId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${deleteProductId}`);
      setSnackbar({ message: "Produit supprimé avec succès", severity: "success" });
      setDeleteProductId(null);
      await load();
    } catch (error) {
      console.error("Failed to delete product:", error);
      setSnackbar({ message: error.response?.data?.message || "Erreur lors de la suppression du produit", severity: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setForm({ name: product.name, type: product.type || '' });
    setDialogOpen(true);
  };
  
  const handleAdd = () => {
    setEditProduct(null);
    setForm({ name: '', type: '' });
    setDialogOpen(true);
  };

  if (isLoading && products.length === 0) {
    return <Loading message="Chargement des produits..." />;
  }

  if (loadingError) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" gutterBottom>Erreur de chargement</Typography>
        <Typography color="textSecondary" paragraph>{loadingError}</Typography>
        <Button variant="outlined" color="primary" onClick={load} startIcon={<RefreshIcon />}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Produits</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={isLoading}
          >
            Ajouter un produit
          </Button>
          <IconButton onClick={load} disabled={isLoading} sx={{ ml: 1 }} title="Rafraîchir les produits">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Paper sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
        <TableContainer>
          {products.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">Aucun produit trouvé. Commencez par en ajouter un.</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead style={tableStyles.head}>
                <TableRow>
                  <TableCell style={tableStyles.cellBold}>Nom</TableCell>
                  <TableCell style={tableStyles.cellBold}>Type</TableCell>
                  <TableCell style={tableStyles.cellBold} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} style={tableStyles.row}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.type || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEdit(product)} color="primary" disabled={isLoading} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => setDeleteProductId(product.id)} color="error" disabled={isLoading} size="small">
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

      <Dialog open={dialogOpen} onClose={() => !isSaving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editProduct ? "Modifier le produit" : "Ajouter un nouveau produit"}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
          <TextField margin="dense" label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} color="inherit" /> : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteProductId} onClose={() => !isDeleting && setDeleteProductId(null)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProductId(null)} disabled={isDeleting}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} color="inherit" /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity || 'info'} sx={{ width: '100%' }} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
