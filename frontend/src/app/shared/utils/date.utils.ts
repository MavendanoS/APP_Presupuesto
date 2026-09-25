/**
 * Utilidades de fecha basadas en la zona horaria LOCAL del usuario.
 *
 * Evitan `new Date().toISOString()` (UTC) y `new Date('YYYY-MM-DD')` (parseado como UTC),
 * que producen desfases de un día en zonas horarias negativas como Chile.
 */

const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formatea una fecha como 'YYYY-MM-DD' usando la hora local. */
export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Fecha de hoy en formato 'YYYY-MM-DD' (hora local). */
export function todayLocalISO(): string {
  return toLocalISODate(new Date());
}

/** Formatea una fecha como 'YYYY-MM' usando la hora local. */
export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Mes actual en formato 'YYYY-MM' (hora local). */
export function currentYearMonth(): string {
  return formatYearMonth(new Date());
}

/** Valida el formato 'YYYY-MM'. */
export function isValidYearMonth(value: string | null | undefined): value is string {
  return !!value && YEAR_MONTH_REGEX.test(value);
}

/**
 * Parsea 'YYYY-MM-DD' como fecha LOCAL (medianoche local).
 * Para otros formatos (ej: timestamps completos) usa el parser nativo.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = ISO_DATE_REGEX.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** Convierte 'YYYY-MM' al primer día de ese mes (hora local). */
export function parseYearMonth(yearMonth: string): Date {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/** Suma (o resta, con n negativo) meses a 'YYYY-MM' usando aritmética de año/mes. */
export function addMonths(yearMonth: string, n: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const total = year * 12 + (month - 1) + n;
  const newYear = Math.floor(total / 12);
  const newMonth = total - newYear * 12 + 1;
  return `${newYear}-${pad2(newMonth)}`;
}

/** 'YYYY-MM' de hace n meses respecto a yearMonth. */
export function monthsAgo(yearMonth: string, n: number): string {
  return addMonths(yearMonth, -n);
}

/** Cantidad de meses (inclusive) entre dos 'YYYY-MM'. Retorna 0 si el rango es inválido. */
export function monthsBetweenInclusive(start: string, end: string): number {
  if (!isValidYearMonth(start) || !isValidYearMonth(end)) return 0;
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const diff = (ey * 12 + em) - (sy * 12 + sm) + 1;
  return diff > 0 ? diff : 0;
}

/** Último día del mes 'YYYY-MM' en formato 'YYYY-MM-DD'. */
export function lastDayOfMonthISO(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  // Día 0 del mes siguiente = último día del mes actual
  return toLocalISODate(new Date(year, month, 0));
}
