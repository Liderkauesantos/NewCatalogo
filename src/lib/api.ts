import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nc_token');
  const slug  = window.location.pathname.split('/')[1];

  if (token) {
    config.headers['Authorization']  = `Bearer ${token}`;
  }
  if (slug) {
    config.headers['Accept-Profile']  = slug;
    config.headers['Content-Profile'] = slug;
  }

  return config;
});

export default api;
