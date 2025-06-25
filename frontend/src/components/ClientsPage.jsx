// src/components/ClientsPage.jsx
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

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState({ name: '', priority_level: 1, contact_info: '', address: '' });

  const [deleteClientId, setDeleteClientId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error("Failed to load clients:", error);
      setLoadingError(error.message || "Une erreur est survenue lors du chargement des clients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editClient) {
        await api.put(`/clients/${editClient.id}`, form);
        setSnackbar({ message: "Client modifié avec succès", severity: "success" });
      } else {
        await api.post('/clients', form);
        setSnackbar({ message: "Client ajouté avec succès", severity: "success" });
      }
      setDialogOpen(false);
      setEditClient(null);
      setForm({ name: '', priority_level: 1, contact_info: '', address: '' });
      await load();
    } catch (e) {
      console.error("Failed to save client:", e);
      setSnackbar({ message: e.response?.data?.message || "Erreur lors de la sauvegarde du client", severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteClientId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/clients/${deleteClientId}`);
      setSnackbar({ message: "Client supprimé avec succès", severity: "success" });
      setDeleteClientId(null);
      await load();
    } catch (error) {
      console.error("Failed to delete client:", error);
      setSnackbar({ message: error.response?.data?.message || "Erreur lors de la suppression du client", severity: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (client) => {
    setEditClient(client);
    setForm(client);
    setDialogOpen(true);
  };

  if (isLoading && clients.length === 0) {
    return <Loading message="Chargement des clients..." />;
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
        <Typography variant="h4">Clients</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={() => {
              setEditClient(null);
              setForm({ name: '', priority_level: 1, contact_info: '', address: '' });
              setDialogOpen(true);
            }}
            disabled={isLoading}
          >
            Ajouter un client
          </Button>
          <IconButton onClick={load} disabled={isLoading} sx={{ ml: 1 }} title="Rafraîchir les clients">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Paper sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
        <TableContainer>
          {clients.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">Aucun client trouvé. Commencez par en ajouter un.</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead style={tableStyles.head}>
                <TableRow>
                  <TableCell style={tableStyles.cellBold}>Nom</TableCell>
                  <TableCell style={tableStyles.cellBold}>Priorité</TableCell>
                  <TableCell style={tableStyles.cellBold}>Contact</TableCell>
                  <TableCell style={tableStyles.cellBold}>Adresse</TableCell>
                  <TableCell style={tableStyles.cellBold} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} style={tableStyles.row}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.priority_level}</TableCell>
                    <TableCell>{client.contact_info}</TableCell>
                    <TableCell>{client.address}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEdit(client)} color="primary" disabled={isLoading} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => setDeleteClientId(client.id)} color="error" disabled={isLoading} size="small">
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
        <DialogTitle>{editClient ? "Modifier le client" : "Ajouter un nouveau client"}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
          <TextField margin="dense" label="Niveau priorité" type="number" value={form.priority_level} onChange={e => setForm({ ...form, priority_level: e.target.value })} fullWidth inputProps={{ min: 1 }} />
          <TextField margin="dense" label="Contact" value={form.contact_info} onChange={e => setForm({ ...form, contact_info: e.target.value })} fullWidth />
          <TextField margin="dense" label="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} color="inherit" /> : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteClientId} onClose={() => !isDeleting && setDeleteClientId(null)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteClientId(null)} disabled={isDeleting}>Annuler</Button>
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
