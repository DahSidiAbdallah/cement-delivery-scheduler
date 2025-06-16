// src/components/LoginPage.jsx
import React, { useState } from 'react';
import {
  Box, TextField, Button, Paper,
  Typography, Alert, CircularProgress
} from '@mui/material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('👉 handleLogin fired', { username, password });
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      console.log('⬇️  Login response data:', res.data);

      if (res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        console.log('✅ Token stored in localStorage:', localStorage.getItem('access_token'));
        navigate('/dashboard');
      } else {
        console.error('⚠️  No access_token in response:', res.data);
        setError('Login succeeded but no token returned');
      }

    } catch (err) {
      console.error('❌ Login error caught:', err);
      setError('Login failed – check console for details');
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
          MAFCI Scheduler
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            fullWidth margin="normal" label="Username"
            value={username} onChange={e=>setUsername(e.target.value)}
          />
          <TextField
            fullWidth margin="normal" label="Password" type="password"
            value={password} onChange={e=>setPassword(e.target.value)}
          />
          <Box sx={{ position: 'relative', mt: 3 }}>
            <Button
              fullWidth variant="contained" type="submit"
              disabled={loading}
            >
              Login
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
