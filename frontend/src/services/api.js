import axios from 'axios';

// Determine the API base URL based on the current host
const getApiBaseUrl = () => {
  // In development, use the current host but change the port to 5000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000`;
  }
  // In production or when accessed via IP, use the current host with port 5000
  return `http://${window.location.hostname}:5000`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true  // Important for sending cookies with CORS
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      console.warn('Authentication required - redirecting to login');
      localStorage.removeItem('access_token');
      window.location.href = '/';
    }
    
    return Promise.reject(error);
  }
);

export default api;
