/**
 * api.js — Axios instance terpusat
 * Semua fetch ke FastAPI melewati file ini.
 * Ganti BASE_URL jika deploy ke server berbeda.
 */
import axios from 'axios'

const api = axios.create({
  // Vite proxy mengarahkan /api → http://127.0.0.1:8000
  // Deteksi Otomatis: Pakai Local jika di localhost, pakai Cloud jika di Firebase URL
  baseURL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000/api'
    : 'https://us-central1-landing-page-5cfbb.cloudfunctions.net/app/api',
  timeout: 30000,
})

// ── Request Interceptor: Set Content-Type untuk JSON requests ────────────
api.interceptors.request.use(
  (config) => {
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
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
