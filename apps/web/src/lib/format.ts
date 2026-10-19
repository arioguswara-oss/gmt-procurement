export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatMoney(value: string | number | null | undefined, currency = 'IDR') {
  const number = Number(value || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency, maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(Number.isFinite(number) ? number : 0);
}

export function formatNumber(value: string | number | null | undefined, digits = 4) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(Number.isFinite(number) ? number : 0);
}

export function humanize(value?: string | null) {
  return (value || '-').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function todayInput() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
