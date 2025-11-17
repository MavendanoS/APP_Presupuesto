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
