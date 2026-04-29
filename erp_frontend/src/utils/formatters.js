/**
 * formatters.js — Utility formatting (setara dengan utils.py Streamlit)
 */

/**
 * Format angka ke format mata uang Rupiah: Rp 45.230.000
 * @param {number} angka
 * @param {boolean} short - jika true, tampilkan versi singkat (45,2Jt)
 */
export function formatRp(angka, short = false) {
  if (angka == null || isNaN(angka)) return 'Rp 0'
  const n = Math.round(angka)

  if (short) {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
    if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}Jt`
    if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}Rb`
    return `Rp ${n}`
  }

  return 'Rp ' + n.toLocaleString('id-ID')
}

/**
 * Format angka pcs/pcs ke format lusin
 */
export function pcsToLusin(pcs) {
  return (pcs / 12).toFixed(1)
}

/**
 * Kembalikan class Tailwind berdasarkan status transaksi
 */
export function getStatusClass(status) {
  switch (status) {
    case 'SELESAI':      return 'badge-success'
    case 'BELUM':        return 'badge-warning'
    case 'PENDING BAYAR': return 'badge-warning'
    case 'PROSES':       return 'badge-info'
    default:             return 'badge-info'
  }
}

/**
 * Format string untuk tampilan input (ribuan separator)
 */
export function formatInputNumber(val) {
  if (val === null || val === undefined || val === '') return '';
  const num = val.toString().replace(/[^0-9]/g, '');
  if (!num) return '';
  return parseInt(num).toLocaleString('id-ID');
}

/**
 * Kembalikan angka murni dari string ber-separator
 */
export function parseNumber(val) {
  if (!val) return 0;
  const num = val.toString().replace(/[^0-9]/g, '');
  return num ? parseInt(num) : 0;
}
