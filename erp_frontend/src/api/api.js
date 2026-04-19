/**
 * api.js — Axios instance terpusat
 * Semua fetch ke FastAPI melewati file ini.
 * Ganti BASE_URL jika deploy ke server berbeda.
 */
import axios from 'axios'

const api = axios.create({
  // Vite proxy mengarahkan /api → http://127.0.0.1:8000
  // Jika tidak pakai Vite proxy, ganti dengan: 'http://127.0.0.1:8000'
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Response Interceptor: tangani error global ────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
