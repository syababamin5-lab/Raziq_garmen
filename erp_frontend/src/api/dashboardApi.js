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

export const updateTarget = (newTarget) =>
  api.post('/dashboard/update-target', { target: newTarget }).then((res) => res.data)

export const getDetailPersediaan = () =>
  api.get('/dashboard/detail-persediaan').then((res) => res.data)

export const getDetailKain = () =>
  api.get('/dashboard/detail-kain').then((res) => res.data)
