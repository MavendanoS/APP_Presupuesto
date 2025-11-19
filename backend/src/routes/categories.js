/**
 * Rutas de Categorías
 * /api/categories/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import {
  createCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  updateCategoryService,
  deleteCategoryService,
  getCategoriesWithStatsService
} from '../services/categoryService.js';

const categoriesRouter = Router({ base: '/api/categories' });

/**
 * GET /api/categories
 * Obtener lista de categorías
 */
categoriesRouter.get('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      type: url.searchParams.get('type')
    };

    const categories = await getCategoriesService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: { categories }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener categorías',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * POST /api/categories
 * Crear una nueva categoría
 */
categoriesRouter.post('/', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const body = await request.json();

    const category = await createCategoryService(env.DB, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { category }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al crear categoría',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/categories/stats
 * Obtener categorías con estadísticas
 */
categoriesRouter.get('/stats', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      type: url.searchParams.get('type'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date')
    };

    console.log('🔍 Backend /stats - URL:', request.url);
    console.log('🔍 Backend /stats - Filters:', filters);
    console.log('🔍 Backend /stats - UserId:', userId);

    const categories = await getCategoriesWithStatsService(env.DB, userId, filters);

    console.log('✅ Backend /stats - Categories found:', categories.length);

    return new Response(JSON.stringify({
      success: true,
      data: { categories }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Backend /stats - Error:', error);
    return new Response(JSON.stringify({
      error: 'Error al obtener estadísticas',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/categories/:id
 * Obtener una categoría específica
 */
categoriesRouter.get('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const categoryId = parseInt(request.params.id);

    if (isNaN(categoryId)) {
      throw new Error('ID de categoría inválido');
    }

    const category = await getCategoryByIdService(env.DB, categoryId, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { category }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener categoría',
      message: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * PUT /api/categories/:id
 * Actualizar una categoría
 */
categoriesRouter.put('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const categoryId = parseInt(request.params.id);
    const body = await request.json();

    if (isNaN(categoryId)) {
      throw new Error('ID de categoría inválido');
    }

    const category = await updateCategoryService(env.DB, categoryId, userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: { category }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al actualizar categoría',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * DELETE /api/categories/:id
 * Eliminar una categoría
 */
categoriesRouter.delete('/:id', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const categoryId = parseInt(request.params.id);

    if (isNaN(categoryId)) {
      throw new Error('ID de categoría inválido');
    }

    await deleteCategoryService(env.DB, categoryId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Categoría eliminada correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al eliminar categoría',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default categoriesRouter;
