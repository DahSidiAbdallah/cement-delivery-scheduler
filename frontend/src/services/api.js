import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',     // use “localhost”
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    // if token is missing, no Authorization header goes out
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
