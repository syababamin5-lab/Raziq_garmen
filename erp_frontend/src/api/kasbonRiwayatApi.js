import api from './api';

export const submitKasbonBaru = async (payload) => {
  const { data } = await api.post('/karyawan/kasbon-baru', payload);
  return data;
};

export const getRiwayatTransaksi = async (limit = 100) => {
  const { data } = await api.get(`/riwayat/transaksi?limit=${limit}`);
  return data;
};

export const submitVoid = async (payload) => {
  const { data } = await api.post('/riwayat/void', payload);
  return data;
};
