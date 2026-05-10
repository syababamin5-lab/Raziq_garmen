import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Config axios to include token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const updateProfile = async (data) => {
  try {
    const response = await axios.put(`${API_URL}/auth/profile`, data, getAuthHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Gagal memperbarui profil' };
  }
};
