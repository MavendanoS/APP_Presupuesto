/**
 * Password Hashing Utilities
 * Usar bcrypt para hashear passwords de forma segura
 *
 * SEGURIDAD: bcrypt es resistente a ataques de fuerza bruta debido a su:
 * - Algoritmo adaptativo (cost factor ajustable)
 * - Resistencia a GPU/ASIC attacks
 * - Salt automático incorporado
 */

import bcrypt from 'bcryptjs';

/**
 * Hashear un password usando bcrypt
 * @param {string} password - Password en texto plano
 * @returns {Promise<string>} Hash del password (incluye salt automáticamente)
 */
export async function hashPassword(password) {
  // Usar 12 salt rounds (balance entre seguridad y performance)
  // Cada incremento duplica el tiempo de cómputo
  const saltRounds = 12;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    console.error('❌ Error al hashear password:', error);
    throw new Error('Error al procesar el password');
  }
}

/**
 * Verificar un password contra su hash
 * @param {string} password - Password en texto plano
 * @param {string} hash - Hash almacenado (formato bcrypt o SHA-256 legacy)
 * @returns {Promise<{isValid: boolean, needsRehash: boolean}>} Resultado de validación
 */
export async function verifyPassword(password, hash) {
  try {
    // Intentar verificación con bcrypt primero (formato nuevo)
    const isValidBcrypt = await bcrypt.compare(password, hash);

    if (isValidBcrypt) {
      return { isValid: true, needsRehash: false };
    }

    // Si falla bcrypt, intentar con SHA-256 legacy (formato antiguo)
    // Solo para permitir migración gradual de usuarios existentes
    if (hash.includes('$')) {
      const isValidLegacy = await verifyPasswordLegacy(password, hash);
      if (isValidLegacy) {
        // Password correcto pero usa formato inseguro - necesita re-hash
        return { isValid: true, needsRehash: true };
      }
    }

    return { isValid: false, needsRehash: false };
  } catch (error) {
    console.error('❌ Error al verificar password:', error);
    return { isValid: false, needsRehash: false };
  }
}

/**
 * Verificar password con SHA-256 legacy (solo para migración)
 * @deprecated Esta función solo existe para migrar usuarios existentes
 * @param {string} password - Password en texto plano
 * @param {string} hash - Hash en formato SHA-256 legacy (salt$hash)
 * @returns {Promise<boolean>} True si coincide
 */
async function verifyPasswordLegacy(password, hash) {
  const [saltHex, storedHash] = hash.split('$');

  if (!saltHex || !storedHash) {
    return false;
  }

  // Hashear el password ingresado con el mismo salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Comparar hashes
  return computedHash === storedHash;
}
