import api from './api';

export const submitTerimaPiutang = async (payload) => {
  const { data } = await api.post('/keuangan/terima-piutang', payload);
  return data;
};

export const submitBayarUtang = async (payload) => {
  const { data } = await api.post('/keuangan/bayar-utang', payload);
  return data;
};

export const submitMutasi = async (payload) => {
  const { data } = await api.post('/keuangan/mutasi', payload);
  return data;
};

export const submitBayarKasbon = async (payload) => {
  const { data } = await api.post('/keuangan/bayar-kasbon', payload);
  return data;
};

export const getSaldo = async () => {
    const { data } = await api.get('/keuangan/saldo');
    return data;
};
