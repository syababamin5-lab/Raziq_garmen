import api from './api';

export const login = async (username, password) => {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
};

export const logout = () => {
  localStorage.clear();
  window.location.href = '/';
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
