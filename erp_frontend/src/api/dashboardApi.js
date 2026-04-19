/**
 * dashboardApi.js — Semua endpoint untuk halaman Dashboard
 */
import api from './api'

/**
 * GET /api/dashboard/summary
 * Mengambil semua data ringkasan dashboard dalam satu request.
 * @returns {Promise<DashboardResponse>}
 */
export const getDashboardSummary = () =>
  api.get('/dashboard/summary').then((res) => res.data)
