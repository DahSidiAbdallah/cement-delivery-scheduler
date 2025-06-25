// src/components/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Paper, Typography, Alert, CircularProgress,
  InputAdornment, IconButton, Link, Fade, Zoom, Container
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import api from '../services/api';
import mafci from '../assets/MAFCI.png';
import { globalStyles } from '../theme';

export default function LoginPage({ showNotification, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    showPassword: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Verify token is still valid
      const verifyToken = async () => {
        try {
          // Try to make an authenticated request to verify the token
          await api.get('/auth/verify-token');
          // If successful, redirect to dashboard
          navigate('/dashboard', { replace: true });
        } catch (error) {
          // If token is invalid, clear it and stay on login page
          console.error('Token verification failed:', error);
          localStorage.removeItem('access_token');
        }
      };
      verifyToken();
    }
  }, [navigate]);

  const handleChange = (prop) => (event) => {
    setFormData({ ...formData, [prop]: event.target.value });
    if (error) setError('');
  };

  const handleClickShowPassword = () => {
    setFormData({ ...formData, showPassword: !formData.showPassword });
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.password) {
      setError('Veuillez remplir tous les champs');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        username: formData.username,
        password: formData.password
      });

      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        if (response.data?.role) {
          localStorage.setItem('role', response.data.role);
        }
        showNotification('Connexion réussie', 'success');
        onLoginSuccess();
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error('Aucun jeton reçu du serveur');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || 'Échec de la connexion. Veuillez réessayer.';
      setError(errorMessage);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth={false} disableGutters sx={{
      ...globalStyles.fullHeight,
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 0,
      }
    }}>
      <Box sx={{
        ...globalStyles.centeredContent,
        position: 'relative',
        zIndex: 1,
        p: 2,
        width: '100%',
        height: '100%',
        overflow: 'auto'
      }}>
        <Zoom in={true} style={{ transitionDelay: '100ms' }}>
          <Paper
            elevation={6}
            sx={{
              p: { xs: 3, sm: 4 },
              width: '100%',
              maxWidth: 450,
              borderRadius: 3,
              transform: shake ? 'translateX(0)' : 'translateX(0)',
              animation: shake ? 'shake 0.5s' : 'none',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
              },
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
        >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <img 
                src={mafci} 
                alt="MAFCI Logo" 
                style={{ 
                  height: 80, 
                  marginBottom: 16,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }} 
              />
              <Typography variant="h5" component="h1" color="primary" fontWeight="bold">
                Gestion des Livraisons
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Connectez-vous pour continuer
              </Typography>
            </Box>

            <Fade in={!!error}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                  display: error ? 'flex' : 'none'
                }}
              >
                {error}
              </Alert>
            </Fade>

            <Box component="form" onSubmit={handleLogin} noValidate>
              <TextField
                fullWidth
                margin="normal"
                label="Nom d'utilisateur"
                variant="outlined"
                value={formData.username}
                onChange={handleChange('username')}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LoginIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Mot de passe"
                type={formData.showPassword ? 'text' : 'password'}
                variant="outlined"
                value={formData.password}
                onChange={handleChange('password')}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                        disabled={loading}
                      >
                        {formData.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ mt: 3, position: 'relative' }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  type="submit"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 'medium',
                    boxShadow: 2,
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Vous n'avez pas de compte ?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/register" 
                    color="primary"
                    underline="hover"
                  >
                    Contactez l'administrateur
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Zoom>
      </Box>
    </Container>
  );
}
