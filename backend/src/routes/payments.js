/**
 * Rutas de Pagos Mensuales
 * /api/payments/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import {
  upsertPaymentSvc,
  deletePaymentSvc,
  getChecklistSvc,
  getHistorySvc,
  getAveragesSvc,
  getBudgetSummarySvc
} from '../services/monthlyPaymentService.js';

const paymentsRouter = Router({ base: '/api/payments' });

/**
 * GET /api/payments/checklist
 * Obtener checklist mensual de pagos
 */
paymentsRouter.get('/checklist', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const month = url.searchParams.get('month');

    const checklist = await getChecklistSvc(env.DB, userId, month);

    return new Response(JSON.stringify({
      success: true,
      data: { checklist }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener checklist',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/payments/history
 * Obtener historial de pagos
 */
paymentsRouter.get('/history', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      service_ids: url.searchParams.get('service_ids'),
      start_month: url.searchParams.get('start_month'),
      end_month: url.searchParams.get('end_month')
    };

    const history = await getHistorySvc(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: { history }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener historial',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/payments/averages
 * Obtener promedios de pagos por servicio
 */
paymentsRouter.get('/averages', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const months = url.searchParams.get('months') || '3';
    const serviceIds = url.searchParams.get('service_ids');

    const averages = await getAveragesSvc(env.DB, userId, months, serviceIds);

    return new Response(JSON.stringify({
      success: true,
      data: { averages }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener promedios',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/payments/budget
 * Obtener resumen de presupuesto mensual
 */
paymentsRouter.get('/budget', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const avgMonths = url.searchParams.get('avg_months') || '3';

    if (!month) {
      throw new Error('El parametro month es requerido');
    }

    const budget = await getBudgetSummarySvc(env.DB, userId, month, avgMonths);

    return new Response(JSON.stringify({
      success: true,
      data: budget
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener resumen de presupuesto',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/payments
 * Crear o actualizar un pago mensual
 */
paymentsRouter.post('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await request.json();

    const payment = await upsertPaymentSvc(env.DB, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { payment }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al registrar pago',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * DELETE /api/payments/:id
 * Eliminar un pago mensual
 */
paymentsRouter.delete('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const paymentId = parseInt(request.params.id);

    if (isNaN(paymentId)) {
      throw new Error('ID de pago invalido');
    }

    await deletePaymentSvc(env.DB, paymentId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Pago eliminado correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al eliminar pago',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default paymentsRouter;
