/**
 * Servicio de Payment Services
 * Logica de negocio para gestion de servicios de pago
 */

import {
  createPaymentService,
  getPaymentServices,
  getPaymentServiceById,
  updatePaymentService,
  deletePaymentService,
  reorderServices
} from '../db/paymentServices.js';
import { sanitizeInput } from '../utils/validators.js';

/**
 * Crear un nuevo servicio de pago
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} data - { name, icon?, color? }
 * @returns {Promise<Object>} Servicio creado
 */
export async function createPaymentServiceSvc(db, userId, data) {
  const { name, icon, color } = data;

  // Validar nombre
  if (!name || sanitizeInput(name).length < 2) {
    throw new Error('El nombre del servicio es requerido (minimo 2 caracteres)');
  }

  // Validar formato de color (hex)
  if (color) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      throw new Error('Color invalido. Usar formato hexadecimal (#RRGGBB)');
    }
  }

  const service = await createPaymentService(db, {
    user_id: userId,
    name: sanitizeInput(name),
    icon: icon || 'credit-card',
    color: color || '#3B82F6'
  });

  return service;
}

/**
 * Obtener servicios de pago del usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - Query params
 * @returns {Promise<Array>} Servicios
 */
export async function getPaymentServicesSvc(db, userId, filters = {}) {
  const parsedFilters = {};

  if (filters.is_active !== undefined && filters.is_active !== null) {
    parsedFilters.is_active = filters.is_active === 'true' || filters.is_active === true;
  }

  return await getPaymentServices(db, userId, parsedFilters);
}

/**
 * Obtener un servicio de pago especifico
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId
 * @returns {Promise<Object>} Servicio
 */
export async function getPaymentServiceByIdSvc(db, serviceId, userId) {
  const service = await getPaymentServiceById(db, serviceId, userId);

  if (!service) {
    throw new Error('Servicio no encontrado');
  }

  return service;
}

/**
 * Actualizar un servicio de pago
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>} Servicio actualizado
 */
export async function updatePaymentServiceSvc(db, serviceId, userId, updates) {
  // Validar color si se proporciona
  if (updates.color) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(updates.color)) {
      throw new Error('Color invalido. Usar formato hexadecimal (#RRGGBB)');
    }
  }

  // Sanitizar nombre si se proporciona
  const cleanUpdates = {
    ...updates,
    name: updates.name ? sanitizeInput(updates.name) : undefined
  };

  return await updatePaymentService(db, serviceId, userId, cleanUpdates);
}

/**
 * Eliminar un servicio de pago
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function deletePaymentServiceSvc(db, serviceId, userId) {
  return await deletePaymentService(db, serviceId, userId);
}

/**
 * Reordenar servicios de pago
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Array<number>} orderedIds - Array de IDs en el nuevo orden
 * @returns {Promise<boolean>}
 */
export async function reorderServicesSvc(db, userId, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('Se requiere un array de IDs');
  }

  return await reorderServices(db, userId, orderedIds);
}
