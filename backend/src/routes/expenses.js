/**
 * Rutas de Gastos
 * /api/expenses/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import {
  createExpenseService,
  getExpensesService,
  getExpenseByIdService,
  updateExpenseService,
  deleteExpenseService,
  getExpensesSummaryService
} from '../services/expenseService.js';

const expensesRouter = Router({ base: '/api/expenses' });

/**
 * GET /api/expenses
 * Obtener lista de gastos con filtros
 */
expensesRouter.get('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);

    // Helper function to sanitize query parameters
    const getParam = (key) => {
      const value = url.searchParams.get(key);
      // Convert empty strings, 'null', 'undefined' to null
      return (value === '' || value === 'null' || value === 'undefined') ? null : value;
    };

    const filters = {
      type: getParam('type'),
      category_id: getParam('category_id'),
      start_date: getParam('start_date'),
      end_date: getParam('end_date'),
      limit: getParam('limit'),
      offset: getParam('offset')
    };

    const result = await getExpensesService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener gastos',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/expenses
 * Crear un nuevo gasto
 */
expensesRouter.post('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await request.json();

    const expense = await createExpenseService(env.DB, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { expense }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al crear gasto',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/expenses/summary
 * Obtener resumen de gastos
 */
expensesRouter.get('/summary', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);

    // Helper function to sanitize query parameters
    const getParam = (key) => {
      const value = url.searchParams.get(key);
      return (value === '' || value === 'null' || value === 'undefined') ? null : value;
    };

    const filters = {
      type: getParam('type'),
      start_date: getParam('start_date'),
      end_date: getParam('end_date')
    };

    const summary = await getExpensesSummaryService(env.DB, userId, filters);

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
 * GET /api/expenses/:id
 * Obtener un gasto específico
 */
expensesRouter.get('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const expenseId = parseInt(request.params.id);

    if (isNaN(expenseId)) {
      throw new Error('ID de gasto inválido');
    }

    const expense = await getExpenseByIdService(env.DB, expenseId, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { expense }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener gasto',
      message: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/expenses/:id
 * Actualizar un gasto
 */
expensesRouter.put('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const expenseId = parseInt(request.params.id);
    const body = await request.json();

    if (isNaN(expenseId)) {
      throw new Error('ID de gasto inválido');
    }

    const expense = await updateExpenseService(env.DB, expenseId, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { expense }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al actualizar gasto',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * DELETE /api/expenses/:id
 * Eliminar un gasto
 */
expensesRouter.delete('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const expenseId = parseInt(request.params.id);

    if (isNaN(expenseId)) {
      throw new Error('ID de gasto inválido');
    }

    await deleteExpenseService(env.DB, expenseId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Gasto eliminado correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al eliminar gasto',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default expensesRouter;
