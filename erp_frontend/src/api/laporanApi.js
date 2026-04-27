import api from './api';

export const getFinancialReport = async (bulan, tahun) => {
  const { data } = await api.get(`/laporan/keuangan?bulan=${bulan}&tahun=${tahun}`);
  return data;
};

export const getBukuBesar = async (kodeAkun, filterNama, bulan, tahun) => {
  const { data } = await api.get(`/laporan/buku-besar?kode_akun=${kodeAkun}&bulan=${bulan}&tahun=${tahun}&filter_nama=${filterNama}`);
  return data;
};

export const getWipCutting = async () => {
    const { data } = await api.get('/laporan/wip-cutting');
    return data;
};
