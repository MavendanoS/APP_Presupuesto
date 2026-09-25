/**
 * Utilidades HTTP
 * Respuestas JSON con forma consistente:
 *   éxito: { success: true, data?, message? }
 *   error: { error, message }
 */

/**
 * Error con código HTTP asociado
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = (message) => new HttpError(404, message);

/**
 * Respuesta JSON
 */
export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

/**
 * Respuesta de error a partir de una excepción.
 * - HttpError: usa su status y mensaje
 * - Errores internos de D1/runtime: 500 con mensaje genérico (no se expone el detalle)
 * - Resto (errores de validación lanzados por los servicios): 400
 */
export function errorResponse(error, title) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: title, message: error.message }, error.status);
  }

  if (isInternalError(error)) {
    console.error(`${title}:`, error);
    return jsonResponse({ error: title, message: 'Error interno del servidor' }, 500);
  }

  return jsonResponse({ error: title, message: error.message }, 400);
}

function isInternalError(error) {
  if (!(error instanceof Error)) return true;
  if (error instanceof SyntaxError) return false; // JSON inválido en el body
  if (error instanceof TypeError || error instanceof ReferenceError) return true;
  return /D1_|SQLITE_|no such (table|column)/i.test(error.message || '');
}

/**
 * Leer el body JSON; lanza un error 400 legible si es inválido
 */
export async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error();
    }
    return body;
  } catch {
    throw new HttpError(400, 'El cuerpo de la solicitud debe ser un JSON válido');
  }
}
