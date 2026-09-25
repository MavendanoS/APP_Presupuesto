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
import { sanitizeInput, parseOptionalAmount, parseBoolean } from '../utils/validators.js';
import { notFound } from '../utils/http.js';
import { parseIdList } from '../utils/ids.js';

const DEFAULT_ICON = 'bi-credit-card';
const DEFAULT_COLOR = '#3B82F6';
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
// Clases de Bootstrap Icons: "bi-nombre-del-icono"
const ICON_REGEX = /^bi-[a-z0-9-]{1,50}$/;
const NAME_MIN = 2;
const NAME_MAX = 60;

function validateName(value) {
  const name = sanitizeInput(value);
  if (name.length < NAME_MIN) {
    throw new Error(`El nombre del servicio es requerido (minimo ${NAME_MIN} caracteres)`);
  }
  if (name.length > NAME_MAX) {
    throw new Error(`El nombre del servicio es demasiado largo (maximo ${NAME_MAX} caracteres)`);
  }
  return name;
}

function validateColor(value) {
  if (!COLOR_REGEX.test(value)) {
    throw new Error('Color invalido. Usar formato hexadecimal (#RRGGBB)');
  }
  return value;
}

/**
 * Normaliza el icono al formato "bi-*" (acepta nombres sin prefijo por compatibilidad)
 */
function validateIcon(value) {
  if (typeof value !== 'string') {
    throw new Error('Icono invalido');
  }
  const icon = value.trim().startsWith('bi-') ? value.trim() : `bi-${value.trim()}`;
  if (!ICON_REGEX.test(icon)) {
    throw new Error('Icono invalido');
  }
  return icon;
}

/**
 * Crear un nuevo servicio de pago
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} data - { name, icon?, color?, expected_amount? }
 * @returns {Promise<Object>} Servicio creado
 */
export async function createPaymentServiceSvc(db, userId, data) {
  return await createPaymentService(db, {
    user_id: userId,
    name: validateName(data.name),
    icon: data.icon ? validateIcon(data.icon) : DEFAULT_ICON,
    color: data.color ? validateColor(data.color) : DEFAULT_COLOR,
    expected_amount: parseOptionalAmount(data.expected_amount, 'El monto esperado')
  });
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
    parsedFilters.is_active = parseBoolean(filters.is_active, 'is_active');
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
    throw notFound('Servicio no encontrado');
  }

  return service;
}

/**
 * Actualizar un servicio de pago
 * Solo se aceptan campos conocidos; cada uno se valida.
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId
 * @param {Object} updates - { name?, icon?, color?, is_active?, sort_order?, expected_amount? }
 * @returns {Promise<Object>} Servicio actualizado
 */
export async function updatePaymentServiceSvc(db, serviceId, userId, updates) {
  const cleanUpdates = {};

  if (updates.name !== undefined) {
    cleanUpdates.name = validateName(updates.name);
  }

  if (updates.icon !== undefined) {
    cleanUpdates.icon = validateIcon(updates.icon);
  }

  if (updates.color !== undefined) {
    cleanUpdates.color = validateColor(updates.color);
  }

  if (updates.is_active !== undefined) {
    cleanUpdates.is_active = parseBoolean(updates.is_active, 'is_active');
  }

  if (updates.sort_order !== undefined) {
    const sortOrder = Number(updates.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
      throw new Error('Orden invalido');
    }
    cleanUpdates.sort_order = sortOrder;
  }

  if (updates.expected_amount !== undefined) {
    cleanUpdates.expected_amount = parseOptionalAmount(updates.expected_amount, 'El monto esperado');
  }

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

  const ids = parseIdList(orderedIds);
  if (ids.length !== orderedIds.length) {
    throw new Error('La lista de IDs contiene valores invalidos o repetidos');
  }

  return await reorderServices(db, userId, ids);
}
