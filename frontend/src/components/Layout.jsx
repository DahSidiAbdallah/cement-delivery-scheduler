// src/components/Layout.jsx
import React, { useMemo, useContext } from 'react';
import { globalStyles } from '../theme';
import MAFCILogo from '../assets/MAFCI.png';
import { AuthContext } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
  Avatar,
  CssBaseline
} from '@mui/material';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory2 as Inventory2Icon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon,
  LocalMall as LocalMallIcon,
  CalendarMonth as CalendarMonthIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const navItems = [
  { label: 'Tableau de bord', to: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Clients', to: '/clients', icon: <PeopleIcon /> },
  { label: 'Produits', to: '/products', icon: <Inventory2Icon /> },
  { label: 'Camions', to: '/trucks', icon: <LocalShippingIcon /> },
  { label: 'Commandes', to: '/orders', icon: <AssignmentIcon /> },
  { label: 'Livraisons', to: '/deliveries', icon: <LocalMallIcon /> },
  { label: 'Calendrier', to: '/schedule', icon: <CalendarMonthIcon /> },
];

export default function Layout() {
  // ...rest of code

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const { onLogout } = useContext(AuthContext) || {};
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    if (onLogout) onLogout();
    navigate('/');
  };


  const drawer = (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src={MAFCILogo} 
          alt="MAFCI Logo" 
          style={{ 
            height: 50, 
            margin: '0 auto',
            display: 'block',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }} 
        />
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={Link}
            to={item.to}
            selected={location.pathname === item.to}
            onClick={isMobile ? handleDrawerToggle : undefined}
            sx={{
              py: 1.5,
              px: 3,
              mb: 1,
              mx: 1,
              borderRadius: 2,
              color: theme.palette.text.primary,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main,
                },
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.contrastText,
                }
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {React.cloneElement(item.icon, {
                color: location.pathname === item.to ? 'inherit' : 'action'
              })}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{
                fontWeight: 500,
                variant: 'body2',
              }} 
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            {navItems.find(item => item.to === location.pathname)?.label || 'Tableau de bord'}
          </Typography>
          <Tooltip title="Déconnexion">
            <IconButton color="inherit" onClick={logout} sx={{ color: 'text.primary' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          zIndex: theme.zIndex.drawer,
        }}
        aria-label="menu items"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: 'none',
              bgcolor: 'background.paper',
              boxShadow: theme.shadows[3],
              position: 'relative',
              height: '100vh',
              overflowY: 'auto',
              ...globalStyles.scrollbar,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          mt: '64px',
          p: 3,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Paper>
      </Box>
    </Box>
  );
}
