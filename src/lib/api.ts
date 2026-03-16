import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nc_token');
  const slug = window.location.pathname.split('/')[1];

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Login e create_admin são funções do schema master, não precisam de Accept-Profile
  const isAuthEndpoint = config.url?.includes('/rpc/login') || config.url?.includes('/rpc/create_admin');

  if (slug && !isAuthEndpoint) {
    config.headers['Accept-Profile'] = slug;
    config.headers['Content-Profile'] = slug;
  }

  return config;
});

export default api;
