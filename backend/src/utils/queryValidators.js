/**
 * Query Validators
 * Validación de campos y operaciones para prevenir SQL injection
 */

/**
 * Campos permitidos para filtros de gastos (expenses)
 */
const ALLOWED_EXPENSE_FILTERS = {
  type: { field: 'e.type', operator: '=' },
  category_id: { field: 'e.category_id', operator: '=' },
  start_date: { field: 'e.date', operator: '>=' },
  end_date: { field: 'e.date', operator: '<=' }
};

/**
 * Campos permitidos para actualización de gastos
 */
const ALLOWED_EXPENSE_UPDATE_FIELDS = [
  'category_id',
  'type',
  'amount',
  'description',
  'date',
  'notes'
];

/**
 * Campos permitidos para filtros de ingresos (income)
 */
const ALLOWED_INCOME_FILTERS = {
  is_recurring: { field: 'is_recurring', operator: '=' },
  start_date: { field: 'date', operator: '>=' },
  end_date: { field: 'date', operator: '<=' }
};

/**
 * Campos permitidos para actualización de ingresos
 */
const ALLOWED_INCOME_UPDATE_FIELDS = [
  'source',
  'amount',
  'date',
  'is_recurring',
  'frequency',
  'notes'
];

/**
 * Campos permitidos para filtros de categorías
 */
const ALLOWED_CATEGORY_FILTERS = {
  type: { field: 'type', operator: '=' }
};

/**
 * Validar que un filtro esté en la whitelist
 * @param {string} filterKey - Nombre del filtro (ej: 'type', 'category_id')
 * @param {Object} allowedFilters - Mapa de filtros permitidos
 * @returns {boolean} true si el filtro es válido
 */
export function isValidFilter(filterKey, allowedFilters) {
  return filterKey in allowedFilters;
}

/**
 * Validar que un campo de actualización esté en la whitelist
 * @param {string} fieldName - Nombre del campo
 * @param {Array<string>} allowedFields - Lista de campos permitidos
 * @returns {boolean} true si el campo es válido
 */
export function isValidUpdateField(fieldName, allowedFields) {
  return allowedFields.includes(fieldName);
}

/**
 * Construir cláusula WHERE segura para gastos
 * @param {number} userId - ID del usuario (siempre requerido)
 * @param {Object} filters - Filtros a aplicar
 * @returns {{ whereClause: string, params: Array }} Cláusula y parámetros seguros
 */
export function buildExpenseWhereClause(userId, filters = {}) {
  const whereConditions = ['e.user_id = ?'];
  const params = [userId];

  // Validar y agregar solo filtros permitidos
  Object.keys(filters).forEach(filterKey => {
    if (isValidFilter(filterKey, ALLOWED_EXPENSE_FILTERS)) {
      const { field, operator } = ALLOWED_EXPENSE_FILTERS[filterKey];
      whereConditions.push(`${field} ${operator} ?`);
      params.push(filters[filterKey]);
    }
  });

  return {
    whereClause: whereConditions.join(' AND '),
    params
  };
}

/**
 * Construir cláusula SET segura para actualización de gastos
 * @param {Object} updates - Campos a actualizar
 * @returns {{ setClause: string, values: Array }} Cláusula SET y valores seguros
 */
export function buildExpenseSetClause(updates) {
  const fields = [];
  const values = [];

  // Validar y agregar solo campos permitidos
  Object.keys(updates).forEach(fieldName => {
    if (isValidUpdateField(fieldName, ALLOWED_EXPENSE_UPDATE_FIELDS)) {
      fields.push(`${fieldName} = ?`);
      values.push(updates[fieldName]);
    }
  });

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
  }

  return {
    setClause: fields.join(', '),
    values
  };
}

/**
 * Construir cláusula WHERE segura para ingresos
 * @param {number} userId - ID del usuario (siempre requerido)
 * @param {Object} filters - Filtros a aplicar
 * @returns {{ whereClause: string, params: Array }} Cláusula y parámetros seguros
 */
export function buildIncomeWhereClause(userId, filters = {}) {
  const whereConditions = ['user_id = ?'];
  const params = [userId];

  Object.keys(filters).forEach(filterKey => {
    if (isValidFilter(filterKey, ALLOWED_INCOME_FILTERS)) {
      const { field, operator } = ALLOWED_INCOME_FILTERS[filterKey];
      whereConditions.push(`${field} ${operator} ?`);
      // Convertir is_recurring booleano a entero para la base de datos
      let value = filters[filterKey];
      if (filterKey === 'is_recurring') {
        value = value ? 1 : 0;
      }
      params.push(value);
    }
  });

  return {
    whereClause: whereConditions.join(' AND '),
    params
  };
}

/**
 * Construir cláusula SET segura para actualización de ingresos
 * @param {Object} updates - Campos a actualizar
 * @returns {{ setClause: string, values: Array }} Cláusula SET y valores seguros
 */
export function buildIncomeSetClause(updates) {
  const fields = [];
  const values = [];

  Object.keys(updates).forEach(fieldName => {
    if (isValidUpdateField(fieldName, ALLOWED_INCOME_UPDATE_FIELDS)) {
      fields.push(`${fieldName} = ?`);
      // Convertir is_recurring booleano a entero para la base de datos
      let value = updates[fieldName];
      if (fieldName === 'is_recurring' && value !== undefined) {
        value = value ? 1 : 0;
      }
      values.push(value);
    }
  });

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
  }

  return {
    setClause: fields.join(', '),
    values
  };
}

/**
 * Construir cláusula WHERE segura para categorías
 * @param {number} userId - ID del usuario
 * @param {Object} filters - Filtros a aplicar
 * @returns {{ whereClause: string, params: Array }} Cláusula y parámetros seguros
 */
export function buildCategoryWhereClause(userId, filters = {}) {
  // Categorías pueden ser transversales (user_id = NULL) o del usuario
  const whereConditions = ['(user_id = ? OR user_id IS NULL)'];
  const params = [userId];

  Object.keys(filters).forEach(filterKey => {
    if (isValidFilter(filterKey, ALLOWED_CATEGORY_FILTERS)) {
      const { field, operator } = ALLOWED_CATEGORY_FILTERS[filterKey];
      whereConditions.push(`${field} ${operator} ?`);
      params.push(filters[filterKey]);
    }
  });

  return {
    whereClause: whereConditions.join(' AND '),
    params
  };
}

/**
 * Sanitizar nombre de campo para ORDER BY
 * Solo permite nombres de columna alfanuméricos y underscore
 * @param {string} fieldName - Nombre del campo
 * @param {Array<string>} allowedFields - Campos permitidos para ordenamiento
 * @returns {string} Campo sanitizado o default 'id'
 */
export function sanitizeOrderByField(fieldName, allowedFields = ['id', 'date', 'created_at', 'amount']) {
  // Validar que solo contenga caracteres permitidos
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
    return 'id'; // Default seguro
  }

  // Validar que esté en la whitelist
  if (!allowedFields.includes(fieldName)) {
    return 'id'; // Default seguro
  }

  return fieldName;
}

/**
 * Validar dirección de ordenamiento
 * @param {string} direction - 'ASC' o 'DESC'
 * @returns {string} 'ASC' o 'DESC' validado
 */
export function sanitizeOrderDirection(direction) {
  const normalized = (direction || '').toUpperCase();
  return normalized === 'DESC' ? 'DESC' : 'ASC';
}

// Exportar constantes para uso externo si es necesario
export {
  ALLOWED_EXPENSE_FILTERS,
  ALLOWED_EXPENSE_UPDATE_FIELDS,
  ALLOWED_INCOME_FILTERS,
  ALLOWED_INCOME_UPDATE_FIELDS,
  ALLOWED_CATEGORY_FILTERS
};
