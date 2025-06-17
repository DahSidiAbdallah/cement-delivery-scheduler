// src/components/ClientsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Snackbar, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';

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
  const [snackbar, setSnackbar] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState({
    name: '', priority_level: 1, contact_info: '', address: ''
  });

  const load = () => api.get('/clients').then(r => setClients(r.data));

  useEffect(() => { load(); }, []);

  // Add or Edit
  const handleSave = async () => {
    try {
      if (editClient) {
        await api.put(`/clients/${editClient.id}`, form);
        setSnackbar({ message: "Client modifié", severity: "success" });
      } else {
        await api.post('/clients', form);
        setSnackbar({ message: "Client ajouté", severity: "success" });
      }
      setDialogOpen(false); setEditClient(null);
      setForm({ name: '', priority_level: 1, contact_info: '', address: '' });
      load();
    } catch (e) {
      setSnackbar({ message: "Erreur lors de la sauvegarde", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/clients/${id}`);
      setSnackbar({ message: "Client supprimé", severity: "success" });
      load();
    } catch {
      setSnackbar({ message: "Erreur lors de la suppression", severity: "error" });
    }
  };

  // Open edit
  const handleEdit = (client) => {
    setEditClient(client);
    setForm(client);
    setDialogOpen(true);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Clients</Typography>
      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => {
          setEditClient(null);
          setForm({ name: '', priority_level: 1, contact_info: '', address: '' });
          setDialogOpen(true);
        }}
      >Ajouter un client</Button>
      <Paper sx={{ borderRadius: 2, boxShadow: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={tableStyles.head}>
                <TableCell sx={tableStyles.cellBold}>Nom</TableCell>
                <TableCell sx={tableStyles.cellBold}>Niveau priorité</TableCell>
                <TableCell sx={tableStyles.cellBold}>Contact</TableCell>
                <TableCell sx={tableStyles.cellBold}>Adresse</TableCell>
                <TableCell align="right" sx={tableStyles.cellBold}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} sx={tableStyles.row}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell align="center">{c.priority_level}</TableCell>
                  <TableCell>{c.contact_info}</TableCell>
                  <TableCell>{c.address}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleEdit(c)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(c.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 &&
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Aucun client trouvé
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editClient ? "Modifier" : "Ajouter"} un client</DialogTitle>
        <DialogContent>
          <TextField
            label="Nom" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Niveau priorité" type="number"
            value={form.priority_level}
            onChange={e => setForm({ ...form, priority_level: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Contact"
            value={form.contact_info}
            onChange={e => setForm({ ...form, contact_info: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Adresse"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
