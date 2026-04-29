import api from './api';

export const submitInvoice = async (payload) => {
  const { data } = await api.post('/penjualan/invoice', payload);
  return data;
};

export const submitReturPenjualan = async (payload) => {
  const { data } = await api.post('/penjualan/retur', payload);
  return data;
};

export const voidInvoice = async (noInvoice) => {
  const { data } = await api.delete(`/penjualan/void/${noInvoice}`);
  return data;
};

export const getPenjualanHistory = async () => {
    const { data } = await api.get('/penjualan/history');
    return data;
};

export const getInvoiceDetails = async (noInv) => {
    const { data } = await api.get(`/penjualan/details/${noInv}`);
    return data;
};

export const bayarInvoiceCepat = async (payload) => {
    const { data } = await api.post('/penjualan/bayar-invoice-cepat', payload);
    return data;
};
