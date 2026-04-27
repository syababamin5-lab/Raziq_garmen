import api from './api';

export const getProduksiOptions = async () => {
  const { data } = await api.get('/produksi/options');
  return data;
};

export const submitCutting = async (payload) => {
  const { data } = await api.post('/produksi/cutting', payload);
  if (!data?.success) throw new Error(data?.message || 'Error occurred');
  return data;
};

export const submitJahit = async (payload) => {
  const { data } = await api.post('/produksi/jahit', payload);
  if (!data?.success) throw new Error(data?.message || 'Error occurred');
  return data;
};

export const getRekapCutting = async () => {
  const { data } = await api.get('/produksi/rekap-cutting');
  return data;
};

export const getWip = async () => {
  const { data } = await api.get('/produksi/wip');
  return data;
};
