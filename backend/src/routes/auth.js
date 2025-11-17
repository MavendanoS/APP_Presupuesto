/**
 * Rutas de Autenticación
 * /api/auth/*
 */

import { Router } from 'itty-router';
import { registerUser, loginUser, getCurrentUser } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

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

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
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
 * Iniciar sesión
 */
authRouter.post('/login', async (request, env) => {
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

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
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

export default authRouter;
