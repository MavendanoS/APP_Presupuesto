/**
 * Rutas de Servicios de Pago
 * /api/services/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import {
  createPaymentServiceSvc,
  getPaymentServicesSvc,
  getPaymentServiceByIdSvc,
  updatePaymentServiceSvc,
  deletePaymentServiceSvc,
  reorderServicesSvc
} from '../services/paymentServiceService.js';

const servicesRouter = Router({ base: '/api/services' });

/**
 * GET /api/services
 * Obtener lista de servicios de pago
 */
servicesRouter.get('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      is_active: url.searchParams.get('active')
    };

    const services = await getPaymentServicesSvc(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: { services }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener servicios',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/services
 * Crear un nuevo servicio de pago
 */
servicesRouter.post('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await request.json();

    const service = await createPaymentServiceSvc(env.DB, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { service }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al crear servicio',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/services/reorder
 * Reordenar servicios de pago
 * NOTA: Debe estar antes de /:id para evitar conflicto de rutas
 */
servicesRouter.put('/reorder', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await request.json();

    await reorderServicesSvc(env.DB, userId, body.orderedIds);

    return new Response(JSON.stringify({
      success: true,
      message: 'Servicios reordenados correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al reordenar servicios',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/services/:id
 * Obtener un servicio de pago especifico
 */
servicesRouter.get('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const serviceId = parseInt(request.params.id);

    if (isNaN(serviceId)) {
      throw new Error('ID de servicio invalido');
    }

    const service = await getPaymentServiceByIdSvc(env.DB, serviceId, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { service }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener servicio',
      message: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/services/:id
 * Actualizar un servicio de pago
 */
servicesRouter.put('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const serviceId = parseInt(request.params.id);
    const body = await request.json();

    if (isNaN(serviceId)) {
      throw new Error('ID de servicio invalido');
    }

    const service = await updatePaymentServiceSvc(env.DB, serviceId, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { service }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al actualizar servicio',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * DELETE /api/services/:id
 * Eliminar un servicio de pago
 */
servicesRouter.delete('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const serviceId = parseInt(request.params.id);

    if (isNaN(serviceId)) {
      throw new Error('ID de servicio invalido');
    }

    await deletePaymentServiceSvc(env.DB, serviceId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Servicio eliminado correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al eliminar servicio',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default servicesRouter;
