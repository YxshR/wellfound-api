import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens (if needed in future)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response.data?.message || 'Internal server error');
    } else if (error.code === 'ECONNABORTED') {
      // Handle timeout - retry once if not already retried
      console.error('Request timeout');
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          return await api(originalRequest);
        } catch (retryError) {
          console.error('Retry failed:', retryError.message);
        }
      }
    } else if (error.code === 'ERR_NETWORK') {
      // Handle network errors
      console.error('Network error - check if backend server is running');
    }
    
    return Promise.reject(error);
  }
);

export default api;