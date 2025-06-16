// src/components/ProductsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, List, ListItem, Snackbar
} from '@mui/material';
import api from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [name, setName]         = useState('');
  const [type, setType]         = useState('');
  const [snackbar, setSnackbar] = useState(null);

  const load = () => api.get('/products').then(r => setProducts(r.data));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    try {
      await api.post('/products', { name, type });
      setName(''); setType('');
      load();
      setSnackbar({ message:'Produit ajouté', severity:'success' });
    } catch {
      setSnackbar({ message:'Erreur lors de l\'ajout du produit', severity:'error' });
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
        <List>
          {products.map(p => (
            <ListItem key={p.id}>{p.name} ({p.type})</ListItem>
          ))}
        </List>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={()=>setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
      />
    </Box>
  );
}
