import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import api from '../services/api';

const roleOptions = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'viewer', label: 'Visualiseur' },
  { value: 'expedition', label: 'Expédition' }
];

export default function UsersPage({ showNotification }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', role: 'viewer', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du chargement des utilisateurs';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchUsers();
      } catch (error) {
        console.error('Error in loadData:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchUsers]);

  const handleOpenDialog = (user = null) => {
    setEditUser(user);
    setForm(user ? { ...user, password: '' } : { username: '', role: 'viewer', password: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditUser(null);
    setForm({ username: '', role: 'viewer', password: '' });
    setError('');
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.username.trim() || (editUser === null && !form.password.trim())) {
      setError('Nom d\'utilisateur et mot de passe requis');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const userData = {
        username: form.username.trim(),
        role: form.role,
        ...(form.password ? { password_hash: form.password } : {})
      };
      
      if (editUser) {
        await api.put(`/users/${editUser.id}`, userData);
        showNotification('Utilisateur modifié avec succès', 'success');
      } else {
        await api.post('/users', userData);
        showNotification('Utilisateur ajouté avec succès', 'success');
      }
      
      handleCloseDialog();
      await fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la sauvegarde de l\'utilisateur';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={2}>Gestion des utilisateurs</Typography>
      <Button variant="contained" color="primary" onClick={() => handleOpenDialog()} sx={{ mb: 2 }}>Ajouter un utilisateur</Button>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom d'utilisateur</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center"><CircularProgress /></TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">Aucun utilisateur trouvé</TableCell>
                </TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    {u.role === 'admin' ? 'Administrateur' : 
                     u.role === 'viewer' ? 'Visualiseur' : 
                     u.role === 'expedition' ? 'Expédition' : u.role}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(u)} color="primary"><EditIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editUser ? 'Modifier utilisateur' : 'Ajouter utilisateur'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            label="Nom d'utilisateur"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="role-label">Rôle</InputLabel>
            <Select
              labelId="role-label"
              name="role"
              value={form.role}
              label="Rôle"
              onChange={handleChange}
            >
              {roleOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            label="Mot de passe"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            fullWidth
            helperText={editUser ? "Laisser vide pour ne pas changer" : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
