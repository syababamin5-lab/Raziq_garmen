/**
 * api.js — Axios instance terpusat
 * Semua fetch ke FastAPI melewati file ini.
 */
import axios from 'axios'

// Deteksi Otomatis di Browser: Pakai Localhost jika di komputer lokal, pakai /api jika di production (Railway)
const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000/api'
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
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
