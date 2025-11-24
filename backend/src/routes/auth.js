/**
 * Rutas de Autenticación
 * /api/auth/*
 */

import { Router } from 'itty-router';
import { registerUser, loginUser, getCurrentUser, generatePasswordResetToken, resetPasswordWithToken, updateUserProfile, changeUserPassword, reAuthenticateUser } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { withRateLimit, resetRateLimit } from '../middleware/rateLimit.js';
import { updateUserPreferences } from '../db/users.js';

const authRouter = Router({ base: '/api/auth' });

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario
 */
authRouter.post('/register', async (request, env) => {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return new Response(JSON.stringify({
        error: 'Faltan datos requeridos',
        required: ['email', 'password', 'name']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await registerUser(env.DB, { email, password, name }, env.JWT_SECRET);

    // Configurar cookie HttpOnly con Partitioned para cookies de terceros (CHIPS)
    // SameSite=None + Partitioned permite cookies cross-site (frontend pages.dev → backend workers.dev)
    const cookieOptions = [
      `auth_token=${result.token}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 días en segundos
    ].join('; ');

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: result.user
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al registrar usuario',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * POST /api/auth/login
 * Iniciar sesión (con rate limiting)
 */
authRouter.post('/login', withRateLimit(async (request, env) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({
        error: 'Faltan datos requeridos',
        required: ['email', 'password']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await loginUser(env.DB, { email, password }, env.JWT_SECRET);

    // Login exitoso - resetear rate limit para esta IP
    resetRateLimit(request);

    // Configurar cookie HttpOnly con Partitioned para cookies de terceros (CHIPS)
    // SameSite=None + Partitioned permite cookies cross-site (frontend pages.dev → backend workers.dev)
    const cookieOptions = [
      `auth_token=${result.token}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 días en segundos
    ].join('; ');

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: result.user
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al iniciar sesión',
      message: error.message
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/auth/logout
 * Cerrar sesión (limpiar cookie)
 */
authRouter.post('/logout', async (request, env) => {
  // Limpiar cookie configurándola con Max-Age=0
  const cookieOptions = [
    'auth_token=',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Path=/',
    'Max-Age=0', // Expirar inmediatamente
  ].join('; ');

  return new Response(JSON.stringify({
    success: true,
    message: 'Sesión cerrada correctamente'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieOptions
    }
  });
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual (requiere autenticación)
 */
authRouter.get('/me', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const user = await getCurrentUser(env.DB, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { user }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener usuario',
      message: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
authRouter.post('/forgot-password', withRateLimit(async (request, env) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({
        error: 'Email requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await generatePasswordResetToken(
      env.DB,
      email,
      env.RESEND_API_KEY,
      env.FRONTEND_URL
    );

    return new Response(JSON.stringify({
      success: true,
      message: result.message
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al procesar solicitud',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/auth/reset-password
 * Resetear contraseña con token
 */
authRouter.post('/reset-password', async (request, env) => {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return new Response(JSON.stringify({
        error: 'Token y nueva contraseña requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await resetPasswordWithToken(env.DB, token, newPassword, env.RESEND_API_KEY);

    return new Response(JSON.stringify({
      success: true,
      message: 'Contraseña actualizada correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al resetear contraseña',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * PUT /api/auth/profile
 * Actualizar perfil de usuario
 */
authRouter.put('/profile', requireAuth(async (request, env) => {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({
        error: 'Nombre y email requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = request.user.userId; // Establecido por requireAuth

    const updatedUser = await updateUserProfile(env.DB, userId, { name, email });

    // Retornar usuario sin password_hash
    const { password_hash: _, ...userWithoutPassword } = updatedUser;

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: userWithoutPassword
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al actualizar perfil',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/auth/change-password
 * Cambiar contraseña de usuario
 */
authRouter.put('/change-password', requireAuth(async (request, env) => {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({
        error: 'Contraseña actual y nueva contraseña requeridas'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = request.user.userId; // Establecido por requireAuth

    await changeUserPassword(env.DB, userId, { currentPassword, newPassword });

    return new Response(JSON.stringify({
      success: true,
      message: 'Contraseña actualizada correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al cambiar contraseña',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/auth/re-authenticate
 * Re-autenticar usuario después de inactividad
 * Valida password sin cerrar sesión
 */
authRouter.post('/re-authenticate', requireAuth(async (request, env) => {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return new Response(JSON.stringify({
        error: 'Contraseña requerida'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = request.user.userId; // Establecido por requireAuth

    const isValid = await reAuthenticateUser(env.DB, userId, password);

    if (!isValid) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Contraseña incorrecta'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Re-autenticación exitosa'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al re-autenticar',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/auth/preferences
 * Actualizar preferencias de idioma y moneda del usuario
 */
authRouter.put('/preferences', requireAuth(async (request, env) => {
  try {
    const body = await request.json();
    const { language, currency } = body;

    // Validar que al menos uno de los campos esté presente
    if (!language && !currency) {
      return new Response(JSON.stringify({
        error: 'Debe proporcionar al menos language o currency'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar idioma si está presente
    if (language && !['es', 'en'].includes(language)) {
      return new Response(JSON.stringify({
        error: 'Idioma inválido. Debe ser "es" o "en"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar moneda si está presente
    if (currency && !['CLP', 'USD'].includes(currency)) {
      return new Response(JSON.stringify({
        error: 'Moneda inválida. Debe ser "CLP" o "USD"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = request.user.userId;

    // Actualizar preferencias
    const preferences = {};
    if (language) preferences.language = language;
    if (currency) preferences.currency = currency;

    const updatedUser = await updateUserPreferences(env.DB, userId, preferences);

    // Remover password_hash de la respuesta
    const { password_hash: _, ...userWithoutPassword } = updatedUser;

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: userWithoutPassword
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al actualizar preferencias',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default authRouter;
