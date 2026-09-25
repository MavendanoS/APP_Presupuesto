/**
 * Validadores de datos
 */

/**
 * Validar formato de email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar fortaleza de password
 * @param {string} password
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 6) {
    errors.push('El password debe tener al menos 6 caracteres');
  }

  if (password && password.length > 100) {
    errors.push('El password es demasiado largo');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validar nombre de usuario
 * @param {string} name
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateName(name) {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  if (name && name.length > 100) {
    errors.push('El nombre es demasiado largo');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizar input de texto
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim();
}

export const MAX_AMOUNT = 1_000_000_000_000; // 1 billón CLP
export const MAX_NOTES_LENGTH = 500;

/**
 * Parsear un monto: acepta number o string numérico, debe ser finito y > 0
 * @param {*} value
 * @param {string} label - Nombre del campo para el mensaje de error
 * @returns {number}
 */
export function parseAmount(value, label = 'El monto') {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
  const amount = isNumeric ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} debe ser un numero mayor a 0`);
  }
  if (amount > MAX_AMOUNT) {
    throw new Error(`${label} es demasiado grande`);
  }
  return amount;
}

/**
 * Parsear un monto opcional (null/'' → null, 0 permitido)
 */
export function parseOptionalAmount(value, label = 'El monto') {
  if (value === null || value === undefined || value === '') return null;
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} debe ser un numero mayor o igual a 0`);
  }
  if (amount > MAX_AMOUNT) {
    throw new Error(`${label} es demasiado grande`);
  }
  return amount;
}

/**
 * Sanitizar notas opcionales con largo máximo
 */
export function sanitizeNotes(value) {
  if (value === null || value === undefined) return null;
  const notes = sanitizeInput(value);
  if (notes.length > MAX_NOTES_LENGTH) {
    throw new Error(`Las notas no pueden superar ${MAX_NOTES_LENGTH} caracteres`);
  }
  return notes || null;
}

/**
 * Parsear un booleano estricto (true/false, 1/0, 'true'/'false')
 */
export function parseBoolean(value, label = 'El valor') {
  if (value === true || value === 1 || value === 'true' || value === '1') return true;
  if (value === false || value === 0 || value === 'false' || value === '0') return false;
  throw new Error(`${label} debe ser verdadero o falso`);
}
