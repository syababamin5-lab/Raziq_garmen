/**
 * api.js — Axios instance terpusat
 * Semua fetch ke FastAPI melewati file ini.
 */
import axios from 'axios'

// Deteksi Otomatis di Browser: Pakai Localhost jika di komputer lokal, pakai /api jika di production (Railway)
const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:8000/api'
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// ── Request Interceptor: Set Content-Type untuk JSON requests ────────────
api.interceptors.request.use(
  (config) => {
    // Ambil token dari localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Jangan set Content-Type jika data adalah FormData (untuk file upload)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: tangani error global ────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(error)
  }
)

/**
 * getFileUrl — Helper untuk mendapatkan URL file (foto/ttd) yang benar
 * Menangani perbedaan antara Localhost (port 8000) dan Production (Railway).
 */
export const getFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  // Jika di localhost, arahkan ke port backend (8000)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:8000${path}`;
  }
  
  // Jika di production, gunakan path relatif (karena frontend & backend satu domain)
  return path;
};

export default api
