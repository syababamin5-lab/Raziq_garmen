import api from './api';

export const submitPembelianBahan = async (payload) => {
  const { data } = await api.post('/pembelian/bahan', payload);
  return data;
};

export const submitOpex = async (payload) => {
  const { data } = await api.post('/pembelian/opex', payload);
  return data;
};

export const submitAset = async (payload) => {
  const { data } = await api.post('/pembelian/aset', payload);
  return data;
};

export const runPenyusutan = async () => {
  const { data } = await api.post('/pembelian/penyusutan');
  return data;
};

export const getAsetSummary = async () => {
  const { data } = await api.get('/pembelian/aset-summary');
  return data;
};

export const getAsetList = async () => {
    const { data } = await api.get('/pembelian/aset-list');
    return data;
};

export const getPembelianList = async () => {
    const { data } = await api.get('/pembelian/list');
    return data;
};

export const getPembelianDetails = async (noPo) => {
    const { data } = await api.get(`/pembelian/details/${noPo}`);
    return data;
};

export const submitReturPembelian = async (payload) => {
    const { data } = await api.post('/pembelian/retur', payload);
    return data;
};

export const bayarPOCepat = async (payload) => {
  const { data } = await api.post('/pembelian/bayar-po-cepat', payload);
  return data;
};

export const voidPembelian = async (noPo) => {
  const { data } = await api.delete(`/pembelian/void/${noPo}`);
  return data;
};
