const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function request(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Error ' + response.status);
  }
  return response.status === 204 ? null : response.json();
}

export const money = (value) => new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
}).format(value || 0);

export const date = (value) => (
  value ? new Date(value).toLocaleDateString('es-CR') : '—'
);
