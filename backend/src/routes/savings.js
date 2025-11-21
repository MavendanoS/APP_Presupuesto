/**
 * Rutas de Ahorros
 * Endpoints para gestión de metas de ahorro y transacciones
 */

import { Router } from 'itty-router';
import {
  createSavingsGoal,
  getSavingsGoals,
  getSavingsGoalById,
  updateSavingsGoal,
  deleteSavingsGoal,
  createTransaction,
  getTransactions,
  deleteTransaction,
  getSavingsSummary
} from '../services/savingsService.js';

const router = Router({ base: '/api/savings' });

/**
 * GET /api/savings
 * Obtener todas las metas de ahorro
 */
router.get('/', async (request, env) => {
  try {
    const userId = request.user.id;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const goals = await getSavingsGoals(env.DB, userId, { status });

    return new Response(JSON.stringify({
      success: true,
      data: { goals }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * GET /api/savings/summary
 * Obtener resumen de ahorros
 */
router.get('/summary', async (request, env) => {
  try {
    const userId = request.user.id;
    const summary = await getSavingsSummary(env.DB, userId);

    return new Response(JSON.stringify({
      success: true,
      data: summary
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * GET /api/savings/:id
 * Obtener una meta por ID
 */
router.get('/:id', async (request, env) => {
  try {
    const userId = request.user.id;
    const goalId = parseInt(request.params.id);

    if (isNaN(goalId)) {
      throw new Error('ID inválido');
    }

    const goal = await getSavingsGoalById(env.DB, userId, goalId);

    return new Response(JSON.stringify({
      success: true,
      data: { goal }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: error.message.includes('no encontrada') ? 404 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * POST /api/savings
 * Crear nueva meta de ahorro
 */
router.post('/', async (request, env) => {
  try {
    const userId = request.user.id;
    const data = await request.json();

    const goal = await createSavingsGoal(env.DB, userId, data);

    return new Response(JSON.stringify({
      success: true,
      data: { goal }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * PUT /api/savings/:id
 * Actualizar meta de ahorro
 */
router.put('/:id', async (request, env) => {
  try {
    const userId = request.user.id;
    const goalId = parseInt(request.params.id);
    const data = await request.json();

    if (isNaN(goalId)) {
      throw new Error('ID inválido');
    }

    const goal = await updateSavingsGoal(env.DB, userId, goalId, data);

    return new Response(JSON.stringify({
      success: true,
      data: { goal }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * DELETE /api/savings/:id
 * Eliminar meta de ahorro
 */
router.delete('/:id', async (request, env) => {
  try {
    const userId = request.user.id;
    const goalId = parseInt(request.params.id);

    if (isNaN(goalId)) {
      throw new Error('ID inválido');
    }

    const result = await deleteSavingsGoal(env.DB, userId, goalId);

    return new Response(JSON.stringify({
      success: true,
      message: result.message
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * GET /api/savings/:id/transactions
 * Obtener transacciones de una meta
 */
router.get('/:id/transactions', async (request, env) => {
  try {
    const userId = request.user.id;
    const goalId = parseInt(request.params.id);

    if (isNaN(goalId)) {
      throw new Error('ID inválido');
    }

    const url = new URL(request.url);
    const filters = {
      type: url.searchParams.get('type'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
      limit: parseInt(url.searchParams.get('limit')) || 50,
      offset: parseInt(url.searchParams.get('offset')) || 0
    };

    const result = await getTransactions(env.DB, userId, goalId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * POST /api/savings/:id/transactions
 * Crear transacción (aporte o retiro)
 */
router.post('/:id/transactions', async (request, env) => {
  try {
    const userId = request.user.id;
    const goalId = parseInt(request.params.id);
    const data = await request.json();

    if (isNaN(goalId)) {
      throw new Error('ID inválido');
    }

    const transaction = await createTransaction(env.DB, userId, goalId, data);

    return new Response(JSON.stringify({
      success: true,
      data: { transaction }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * DELETE /api/savings/:id/transactions/:transactionId
 * Eliminar una transacción
 */
router.delete('/:id/transactions/:transactionId', async (request, env) => {
  try {
    const userId = request.user.id;
    const goalId = parseInt(request.params.id);
    const transactionId = parseInt(request.params.transactionId);

    if (isNaN(goalId) || isNaN(transactionId)) {
      throw new Error('ID inválido');
    }

    const result = await deleteTransaction(env.DB, userId, goalId, transactionId);

    return new Response(JSON.stringify({
      success: true,
      message: result.message
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

export default router;
