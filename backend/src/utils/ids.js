/**
 * Utilidades para listas de IDs recibidas por query string o body
 */

// D1 admite hasta 100 parámetros por query; dejamos margen para el resto de filtros
export const MAX_IDS = 90;

/**
 * Parsear una lista de IDs ("1,2,3" o [1,2,3]) a enteros positivos únicos
 * @returns {Array<number>|null} null si no se especificó filtro
 */
export function parseIdList(value) {
  if (value === undefined || value === null || value === '') return null;

  const raw = Array.isArray(value) ? value : String(value).split(',');
  const ids = [...new Set(raw.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0))];

  if (ids.length > MAX_IDS) {
    throw new Error(`Se permiten como maximo ${MAX_IDS} IDs`);
  }

  return ids;
}
