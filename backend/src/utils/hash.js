/**
 * Password Hashing Utilities
 * Usar Web Crypto API para hashear passwords
 */

/**
 * Hashear un password usando SHA-256 con salt
 * @param {string} password - Password en texto plano
 * @returns {Promise<string>} Hash del password en formato: salt$hash
 */
export async function hashPassword(password) {
  // Generar salt aleatorio
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Combinar password + salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);

  // Hash con SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Retornar en formato: salt$hash
  return `${saltHex}$${hashHex}`;
}

/**
 * Verificar un password contra su hash
 * @param {string} password - Password en texto plano
 * @param {string} hash - Hash almacenado (formato: salt$hash)
 * @returns {Promise<boolean>} True si coincide, false si no
 */
export async function verifyPassword(password, hash) {
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
