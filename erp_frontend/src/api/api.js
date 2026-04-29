/**
 * api.js — Axios instance terpusat
 * Semua fetch ke FastAPI melewati file ini.
 * Set VITE_API_URL di Railway environment variables untuk production.
 */
import axios from 'axios'

// Gunakan VITE_API_URL dari env jika ada (Railway), fallback ke localhost untuk development
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

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
