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

// ── Saldo Awal WIP (Setup Cut-off) ──────────────────────────────
export const submitSaldoAwalWip = async (payload) => {
  const { data } = await api.post('/produksi/saldo-awal-wip', payload);
  if (!data?.success) throw new Error(data?.message || 'Error occurred');
  return data;
};

export const getSaldoAwalWipList = async () => {
  const { data } = await api.get('/produksi/saldo-awal-wip');
  return data;
};

export const deleteSaldoAwalWip = async (entryId) => {
  const { data } = await api.delete(`/produksi/saldo-awal-wip/${entryId}`);
  if (!data?.success) throw new Error(data?.message || 'Error occurred');
  return data;
};

export const getCuttingStats = async () => {
  const { data } = await api.get('/produksi/cutting-stats');
  return data;
};

export const getCuttingHistory = async (periode) => {
  const { data } = await api.get(`/produksi/cutting-history?periode=${periode}`);
  return data;
};
