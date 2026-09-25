/**
 * Rutas de Ingresos Mensuales
 * /api/incomes/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import { errorResponse, readJson } from '../utils/http.js';
import {
  createIncomeSvc,
  updateIncomeSvc,
  deleteIncomeSvc,
  getIncomeByIdSvc,
  getIncomeHistorySvc,
  getIncomeMonthlySummarySvc,
  getIncomeTotalsByMonthSvc
} from '../services/monthlyIncomeService.js';

const incomesRouter = Router({ base: '/api/incomes' });

/**
 * GET /api/incomes/monthly?month=YYYY-MM
 * Resumen mensual: lista de ingresos del mes + total
 */
incomesRouter.get('/monthly', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const month = url.searchParams.get('month');

    if (!month) {
      throw new Error('El parametro month es requerido');
    }

    const summary = await getIncomeMonthlySummarySvc(env.DB, userId, month);

    return new Response(JSON.stringify({
      success: true,
      data: summary
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al obtener resumen mensual de ingresos');
  }
}));

/**
 * GET /api/incomes/history?start_month=&end_month=
 * Historial de ingresos con filtros opcionales
 */
incomesRouter.get('/history', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_month: url.searchParams.get('start_month'),
      end_month: url.searchParams.get('end_month')
    };

    const history = await getIncomeHistorySvc(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: { history }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al obtener historial de ingresos');
  }
}));

/**
 * GET /api/incomes/totals-by-month?start_month=&end_month=
 * Totales por mes (para graficos de evolucion)
 */
incomesRouter.get('/totals-by-month', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_month: url.searchParams.get('start_month'),
      end_month: url.searchParams.get('end_month')
    };

    const totals = await getIncomeTotalsByMonthSvc(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: { totals }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al obtener totales por mes');
  }
}));

/**
 * POST /api/incomes
 * Crear un nuevo ingreso
 */
incomesRouter.post('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await readJson(request);

    const income = await createIncomeSvc(env.DB, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { income }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al registrar ingreso');
  }
}));

/**
 * GET /api/incomes/:id
 * Obtener un ingreso por ID
 */
incomesRouter.get('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomeId = parseInt(request.params.id);

    const income = await getIncomeByIdSvc(env.DB, incomeId, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { income }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al obtener ingreso');
  }
}));

/**
 * PUT /api/incomes/:id
 * Actualizar un ingreso existente
 */
incomesRouter.put('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomeId = parseInt(request.params.id);
    const body = await readJson(request);

    const income = await updateIncomeSvc(env.DB, incomeId, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { income }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al actualizar ingreso');
  }
}));

/**
 * DELETE /api/incomes/:id
 * Eliminar un ingreso
 */
incomesRouter.delete('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const incomeId = parseInt(request.params.id);

    await deleteIncomeSvc(env.DB, incomeId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Ingreso eliminado correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return errorResponse(error, 'Error al eliminar ingreso');
  }
}));

export default incomesRouter;
