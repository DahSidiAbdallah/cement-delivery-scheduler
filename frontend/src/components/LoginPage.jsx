// src/components/LoginPage.jsx
import React, { useState } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, Alert, CircularProgress
} from '@mui/material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import mafci from '../assets/MAFCI.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('👉 Connexion déclenchée', { username, password });
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      console.log('⬇️  Réponse de connexion :', res.data);

      if (res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        console.log('✅ Jeton stocké dans le localStorage:', localStorage.getItem('access_token'));
        navigate('/dashboard');
      } else {
        console.error('⚠️  Aucun jeton dans la réponse:', res.data);
        setError('Connexion réussie mais aucun jeton retourné');
      }

    } catch (err) {
      console.error('❌ Erreur de connexion :', err);
      setError('Échec de la connexion – vérifiez la console pour plus de détails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: 'background.default', p: 2
      }}
    >
      <Paper sx={{ p: 4, width: 300 }}>
        <Typography variant="h5" gutterBottom align="center">
          <img src={mafci} alt="Logo MAFCI" style={{ height: 100, marginBottom: 16 }} />
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            fullWidth margin="normal" label="Nom d'utilisateur"
            value={username} onChange={e=>setUsername(e.target.value)}
          />
          <TextField
            fullWidth margin="normal" label="Mot de passe" type="password"
            value={password} onChange={e=>setPassword(e.target.value)}
          />
          <Box sx={{ position: 'relative', mt: 3 }}>
            <Button
              fullWidth variant="contained" type="submit"
              disabled={loading}
            >
              Se connecter
            </Button>
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute', top: '50%',
                  left: '50%', marginTop: '-12px',
                  marginLeft: '-12px'
                }}
              />
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
