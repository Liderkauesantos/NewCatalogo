import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nc_token');
  const slug = window.location.pathname.split('/')[1];

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Endpoints do schema master precisam do header Accept-Profile: master
  const isMasterEndpoint =
    config.url?.includes('/rpc/login') ||
    config.url?.includes('/rpc/create_admin') ||
    config.url?.includes('/tenants');

  if (isMasterEndpoint) {
    // Forçar schema master para esses endpoints
    config.headers['Accept-Profile'] = 'master';
    config.headers['Content-Profile'] = 'master';
  } else if (slug) {
    // Usar schema do tenant para outros endpoints
    config.headers['Accept-Profile'] = slug;
    config.headers['Content-Profile'] = slug;
  }

  return config;
});

export default api;
