import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import ProductsPage from './components/ProductsPage';
import TrucksPage from './components/TrucksPage';
import OrdersPage from './components/OrdersPage';
import DeliveriesPage from './components/DeliveriesPage';
import SchedulePage from './components/SchedulePage';

function App() {
  const token = localStorage.getItem('access_token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={token ? <Layout /> : <Navigate to="/" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/trucks" element={<TrucksPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
