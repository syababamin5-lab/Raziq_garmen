import api from './api';

export const updateProfile = async (data) => {
  try {
    const response = await api.put('/auth/profile', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Gagal memperbarui profil' };
  }
};
