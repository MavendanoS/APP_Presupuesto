/**
 * Utilidades de fechas
 * La app opera en hora de Chile: los "meses actuales" y fechas por defecto
 * se calculan en America/Santiago, no en UTC.
 */

export const TIME_ZONE = 'America/Santiago';
export const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Fecha de hoy en Chile, formato YYYY-MM-DD
 */
export function todayInChile(now = new Date()) {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

/**
 * Mes actual en Chile, formato YYYY-MM
 */
export function currentYearMonth(now = new Date()) {
  return todayInChile(now).slice(0, 7);
}

/**
 * Sumar (o restar) meses a un YYYY-MM
 */
export function addMonths(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Valida un YYYY-MM dentro de un rango razonable de años
 */
export function isValidYearMonth(value) {
  if (typeof value !== 'string' || !YEAR_MONTH_REGEX.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 2000 && year <= 2100;
}

/**
 * Valida una fecha estricta YYYY-MM-DD (que exista en el calendario)
 */
export function isValidDate(value) {
  if (typeof value !== 'string') return false;
  const match = DATE_REGEX.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    && y >= 2000 && y <= 2100;
}
