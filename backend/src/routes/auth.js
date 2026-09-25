/**
 * Rutas de Autenticación
 * /api/auth/*
 */

import { Router } from 'itty-router';
import { registerUser, loginUser, getCurrentUser, generatePasswordResetToken, resetPasswordWithToken, updateUserProfile, changeUserPassword, reAuthenticateUser } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { withRateLimit, resetRateLimit } from '../middleware/rateLimit.js';
import { updateUserPreferences } from '../db/users.js';
import { createToken } from '../utils/jwt.js';
import { jsonResponse, errorResponse, readJson } from '../utils/http.js';

const authRouter = Router({ base: '/api/auth' });

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 días en segundos

/**
 * Cookie HttpOnly con Partitioned para cookies de terceros (CHIPS)
 * SameSite=None + Partitioned permite cookies cross-site (frontend pages.dev → backend workers.dev)
 */
function sessionCookie(token, maxAge = SESSION_MAX_AGE) {
  return [
    `auth_token=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Path=/',
    `Max-Age=${maxAge}`
  ].join('; ');
}

function missingFields(fields) {
  return jsonResponse({
    error: 'Faltan datos requeridos',
    message: `Campos requeridos: ${fields.join(', ')}`
  }, 400);
}

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario
 */
authRouter.post('/register', withRateLimit('register', async (request, env) => {
  try {
    const { email, password, name } = await readJson(request);

    if (!email || !password || !name) {
      return missingFields(['email', 'password', 'name']);
    }

    const result = await registerUser(env.DB, { email, password, name }, env.JWT_SECRET);

    return jsonResponse(
      { success: true, data: { user: result.user } },
      201,
      { 'Set-Cookie': sessionCookie(result.token) }
    );
  } catch (error) {
    return errorResponse(error, 'Error al registrar usuario');
  }
}, { maxAttempts: 5, windowSeconds: 60 * 60 }));

/**
 * POST /api/auth/login
 * Iniciar sesión (con rate limiting)
 */
authRouter.post('/login', withRateLimit('login', async (request, env) => {
  try {
    const { email, password } = await readJson(request);

    if (!email || !password) {
      return missingFields(['email', 'password']);
    }

    const result = await loginUser(env.DB, { email, password }, env.JWT_SECRET);

    // Login exitoso - resetear rate limit para esta IP
    await resetRateLimit(env.DB, 'login', request);

    return jsonResponse(
      { success: true, data: { user: result.user } },
      200,
      { 'Set-Cookie': sessionCookie(result.token) }
    );
  } catch (error) {
    return errorResponse(error, 'Error al iniciar sesión');
  }
}));

/**
 * POST /api/auth/logout
 * Cerrar sesión (limpiar cookie)
 */
authRouter.post('/logout', async () => {
  return jsonResponse(
    { success: true, message: 'Sesión cerrada correctamente' },
    200,
    { 'Set-Cookie': sessionCookie('', 0) }
  );
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual (requiere autenticación)
 */
authRouter.get('/me', requireAuth(async (request, env) => {
  try {
    const user = await getCurrentUser(env.DB, request.user.userId);
    return jsonResponse({ success: true, data: { user } });
  } catch (error) {
    return errorResponse(error, 'Error al obtener usuario');
  }
}));

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
authRouter.post('/forgot-password', withRateLimit('forgot-password', async (request, env) => {
  try {
    const { email } = await readJson(request);

    if (!email) {
      return missingFields(['email']);
    }

    const result = await generatePasswordResetToken(
      env.DB,
      email,
      env.RESEND_API_KEY,
      env.FRONTEND_URL
    );

    return jsonResponse({ success: true, message: result.message });
  } catch (error) {
    return errorResponse(error, 'Error al procesar solicitud');
  }
}));

/**
 * POST /api/auth/reset-password
 * Resetear contraseña con token
 */
authRouter.post('/reset-password', withRateLimit('reset-password', async (request, env) => {
  try {
    const { token, newPassword } = await readJson(request);

    if (!token || !newPassword) {
      return missingFields(['token', 'newPassword']);
    }

    await resetPasswordWithToken(env.DB, token, newPassword, env.RESEND_API_KEY);

    return jsonResponse({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    return errorResponse(error, 'Error al resetear contraseña');
  }
}, { maxAttempts: 10 }));

/**
 * PUT /api/auth/profile
 * Actualizar perfil de usuario (cambiar email requiere currentPassword)
 */
authRouter.put('/profile', requireAuth(async (request, env) => {
  try {
    const { name, email, currentPassword } = await readJson(request);

    if (!name || !email) {
      return missingFields(['name', 'email']);
    }

    const user = await updateUserProfile(env.DB, request.user.userId, { name, email, currentPassword });

    // El JWT incluye el email: emitir uno nuevo con los datos actualizados
    const token = await createToken({ userId: user.id, email: user.email }, env.JWT_SECRET);

    return jsonResponse(
      { success: true, data: { user } },
      200,
      { 'Set-Cookie': sessionCookie(token) }
    );
  } catch (error) {
    return errorResponse(error, 'Error al actualizar perfil');
  }
}));

/**
 * PUT /api/auth/change-password
 * Cambiar contraseña de usuario. Revoca otras sesiones y renueva la cookie actual.
 */
authRouter.put('/change-password', requireAuth(withRateLimit('change-password', async (request, env) => {
  try {
    const { currentPassword, newPassword } = await readJson(request);

    if (!currentPassword || !newPassword) {
      return missingFields(['currentPassword', 'newPassword']);
    }

    const user = await changeUserPassword(
      env.DB,
      request.user.userId,
      { currentPassword, newPassword },
      env.RESEND_API_KEY
    );

    // Emitir un token nuevo (posterior a password_changed_at) para mantener esta sesión
    const token = await createToken({ userId: user.id, email: user.email }, env.JWT_SECRET);

    return jsonResponse(
      { success: true, message: 'Contraseña actualizada correctamente' },
      200,
      { 'Set-Cookie': sessionCookie(token) }
    );
  } catch (error) {
    return errorResponse(error, 'Error al cambiar contraseña');
  }
})));

/**
 * POST /api/auth/re-authenticate
 * Re-autenticar usuario después de inactividad
 * Valida password sin cerrar sesión
 */
authRouter.post('/re-authenticate', requireAuth(withRateLimit('re-authenticate', async (request, env) => {
  try {
    const { password } = await readJson(request);

    if (!password) {
      return missingFields(['password']);
    }

    const isValid = await reAuthenticateUser(env.DB, request.user.userId, password);

    if (!isValid) {
      return jsonResponse({
        error: 'Error al re-autenticar',
        message: 'Contraseña incorrecta'
      }, 401);
    }

    await resetRateLimit(env.DB, 're-authenticate', request);

    return jsonResponse({ success: true, message: 'Re-autenticación exitosa' });
  } catch (error) {
    return errorResponse(error, 'Error al re-autenticar');
  }
}, { maxAttempts: 10 })));

/**
 * PUT /api/auth/preferences
 * Actualizar preferencias de idioma y moneda del usuario
 */
authRouter.put('/preferences', requireAuth(async (request, env) => {
  try {
    const { language, currency } = await readJson(request);

    // Validar que al menos uno de los campos esté presente
    if (!language && !currency) {
      return jsonResponse({
        error: 'Error al actualizar preferencias',
        message: 'Debe proporcionar al menos language o currency'
      }, 400);
    }

    // Idioma y moneda se validan en updateUserPreferences
    const preferences = {};
    if (language) preferences.language = language;
    if (currency) preferences.currency = currency;

    const user = await updateUserPreferences(env.DB, request.user.userId, preferences);

    return jsonResponse({ success: true, data: { user } });
  } catch (error) {
    return errorResponse(error, 'Error al actualizar preferencias');
  }
}));

export default authRouter;
