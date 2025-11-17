/**
 * Rutas de Ingresos
 * /api/income/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import {
  createIncomeService,
  getIncomesService,
  getIncomeByIdService,
  updateIncomeService,
  deleteIncomeService,
  getIncomesSummaryService,
  getRecurringIncomesService
} from '../services/incomeService.js';

const incomeRouter = Router({ base: '/api/income' });

/**
 * GET /api/income
 * Obtener lista de ingresos con filtros
 */
incomeRouter.get('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      is_recurring: url.searchParams.get('is_recurring'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset')
    };

    const result = await getIncomesService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener ingresos',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/income
 * Crear un nuevo ingreso
 */
incomeRouter.post('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await request.json();

    const income = await createIncomeService(env.DB, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { income }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al crear ingreso',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/income/summary
 * Obtener resumen de ingresos
 */
incomeRouter.get('/summary', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date')
    };

    const summary = await getIncomesSummaryService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: summary
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener resumen',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/income/recurring
 * Obtener ingresos recurrentes
 */
incomeRouter.get('/recurring', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomes = await getRecurringIncomesService(env.DB, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { incomes }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener ingresos recurrentes',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/income/:id
 * Obtener un ingreso específico
 */
incomeRouter.get('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomeId = parseInt(request.params.id);

    if (isNaN(incomeId)) {
      throw new Error('ID de ingreso inválido');
    }

    const income = await getIncomeByIdService(env.DB, incomeId, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { income }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener ingreso',
      message: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/income/:id
 * Actualizar un ingreso
 */
incomeRouter.put('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomeId = parseInt(request.params.id);
    const body = await request.json();

    if (isNaN(incomeId)) {
      throw new Error('ID de ingreso inválido');
    }

    const income = await updateIncomeService(env.DB, incomeId, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { income }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al actualizar ingreso',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * DELETE /api/income/:id
 * Eliminar un ingreso
 */
incomeRouter.delete('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomeId = parseInt(request.params.id);

    if (isNaN(incomeId)) {
      throw new Error('ID de ingreso inválido');
    }

    await deleteIncomeService(env.DB, incomeId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Ingreso eliminado correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al eliminar ingreso',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default incomeRouter;
