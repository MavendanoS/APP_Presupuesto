/**
 * JWT Utilities
 * Funciones para crear y verificar tokens JWT
 */

// Codificar en base64url
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Decodificar desde base64url
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

/**
 * Crear un JWT
 * @param {Object} payload - Datos del usuario (userId, email)
 * @param {string} secret - Secret key para firmar
 * @param {number} expiresIn - Tiempo de expiración en segundos (default: 7 días)
 * @returns {Promise<string>} Token JWT
 */
export async function createToken(payload, secret, expiresIn = 7 * 24 * 60 * 60) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  // Codificar header y payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));

  // Crear mensaje para firmar
  const message = `${encodedHeader}.${encodedPayload}`;

  // Firmar con HMAC SHA-256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  // Convertir signature a base64url
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureString = String.fromCharCode(...signatureArray);
  const encodedSignature = base64UrlEncode(signatureString);

  return `${message}.${encodedSignature}`;
}

/**
 * Verificar y decodificar un JWT
 * @param {string} token - Token JWT
 * @param {string} secret - Secret key
 * @returns {Promise<Object>} Payload decodificado
 * @throws {Error} Si el token es inválido o expirado
 */
export async function verifyToken(token, secret) {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Token inválido');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // Verificar firma
  const message = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Decodificar la firma recibida
  const signatureString = base64UrlDecode(encodedSignature);
  const signatureArray = new Uint8Array(
    Array.from(signatureString).map(char => char.charCodeAt(0))
  );

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureArray,
    encoder.encode(message)
  );

  if (!isValid) {
    throw new Error('Token inválido - firma no coincide');
  }

  // Decodificar payload
  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  // Verificar expiración
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expirado');
  }

  return payload;
}
