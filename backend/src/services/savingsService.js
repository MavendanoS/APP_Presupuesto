/**
 * Servicio de Ahorros
 * Lógica de negocio para gestión de metas de ahorro y transacciones
 */

import { sanitizeInput } from '../utils/validators.js';

/**
 * Crear una nueva meta de ahorro
 */
export async function createSavingsGoal(db, userId, data) {
  const { name, target_amount, deadline, description, color, icon } = data;

  // Validaciones
  if (!name || name.trim().length === 0) {
    throw new Error('El nombre de la meta es obligatorio');
  }

  if (!target_amount || target_amount <= 0) {
    throw new Error('El monto objetivo debe ser mayor a 0');
  }

  // Validar fecha límite (opcional)
  if (deadline) {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    if (deadlineDate < today) {
      throw new Error('La fecha límite no puede ser en el pasado');
    }
  }

  const result = await db.prepare(`
    INSERT INTO savings_goals (
      user_id, name, target_amount, deadline, description, color, icon
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    sanitizeInput(name),
    target_amount,
    deadline || null,
    sanitizeInput(description || ''),
    color || '#3B82F6',
    icon || 'piggy-bank'
  ).run();

  if (!result.success) {
    throw new Error('Error al crear la meta de ahorro');
  }

  // Obtener la meta recién creada
  const goal = await db.prepare(`
    SELECT * FROM savings_goals WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return goal;
}

/**
 * Obtener todas las metas de ahorro de un usuario
 */
export async function getSavingsGoals(db, userId, filters = {}) {
  const { status } = filters;

  let query = 'SELECT * FROM savings_goals WHERE user_id = ?';
  const params = [userId];

  if (status && ['active', 'completed', 'cancelled'].includes(status)) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const goals = await db.prepare(query).bind(...params).all();
  return goals.results || [];
}

/**
 * Obtener una meta de ahorro por ID
 */
export async function getSavingsGoalById(db, userId, goalId) {
  const goal = await db.prepare(`
    SELECT * FROM savings_goals WHERE id = ? AND user_id = ?
  `).bind(goalId, userId).first();

  if (!goal) {
    throw new Error('Meta de ahorro no encontrada');
  }

  return goal;
}

/**
 * Actualizar una meta de ahorro
 */
export async function updateSavingsGoal(db, userId, goalId, data) {
  // Verificar que la meta existe y pertenece al usuario
  await getSavingsGoalById(db, userId, goalId);

  const { name, target_amount, deadline, description, color, icon, status } = data;

  // Construir query dinámicamente
  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(sanitizeInput(name));
  }

  if (target_amount !== undefined) {
    if (target_amount <= 0) {
      throw new Error('El monto objetivo debe ser mayor a 0');
    }
    updates.push('target_amount = ?');
    params.push(target_amount);
  }

  if (deadline !== undefined) {
    updates.push('deadline = ?');
    params.push(deadline || null);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(sanitizeInput(description));
  }

  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }

  if (icon !== undefined) {
    updates.push('icon = ?');
    params.push(icon);
  }

  if (status !== undefined) {
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      throw new Error('Estado inválido');
    }
    updates.push('status = ?');
    params.push(status);

    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
  }

  if (updates.length === 0) {
    throw new Error('No hay datos para actualizar');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(goalId, userId);

  const query = `
    UPDATE savings_goals
    SET ${updates.join(', ')}
    WHERE id = ? AND user_id = ?
  `;

  const result = await db.prepare(query).bind(...params).run();

  if (!result.success) {
    throw new Error('Error al actualizar la meta de ahorro');
  }

  // Retornar meta actualizada
  return await getSavingsGoalById(db, userId, goalId);
}

/**
 * Eliminar una meta de ahorro
 */
export async function deleteSavingsGoal(db, userId, goalId) {
  // Verificar que existe
  await getSavingsGoalById(db, userId, goalId);

  const result = await db.prepare(`
    DELETE FROM savings_goals WHERE id = ? AND user_id = ?
  `).bind(goalId, userId).run();

  if (!result.success) {
    throw new Error('Error al eliminar la meta de ahorro');
  }

  return { message: 'Meta de ahorro eliminada exitosamente' };
}

/**
 * Crear una transacción (aporte o retiro)
 */
export async function createTransaction(db, userId, goalId, data) {
  const { amount, type, date, notes } = data;

  // Validaciones
  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (!type || !['deposit', 'withdrawal'].includes(type)) {
    throw new Error('Tipo de transacción inválido (deposit o withdrawal)');
  }

  if (!date) {
    throw new Error('La fecha es obligatoria');
  }

  // Verificar que la meta existe
  const goal = await getSavingsGoalById(db, userId, goalId);

  // Validar retiro: no puede retirar más de lo que tiene
  if (type === 'withdrawal' && amount > goal.current_amount) {
    throw new Error('No puedes retirar más de lo que has ahorrado');
  }

  // Crear transacción
  const result = await db.prepare(`
    INSERT INTO savings_transactions (
      savings_goal_id, user_id, amount, type, date, notes
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    goalId,
    userId,
    amount,
    type,
    date,
    sanitizeInput(notes || '')
  ).run();

  if (!result.success) {
    throw new Error('Error al crear la transacción');
  }

  // Actualizar current_amount de la meta
  const newAmount = type === 'deposit'
    ? goal.current_amount + amount
    : goal.current_amount - amount;

  const updateResult = await db.prepare(`
    UPDATE savings_goals
    SET current_amount = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(newAmount, goalId, userId).run();

  if (!updateResult.success) {
    throw new Error('Error al actualizar el monto ahorrado');
  }

  // Si se alcanzó la meta, marcarla como completada
  if (newAmount >= goal.target_amount && goal.status === 'active') {
    await db.prepare(`
      UPDATE savings_goals
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(goalId, userId).run();
  }

  // Obtener la transacción creada
  const transaction = await db.prepare(`
    SELECT * FROM savings_transactions WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return transaction;
}

/**
 * Obtener transacciones de una meta
 */
export async function getTransactions(db, userId, goalId, filters = {}) {
  // Verificar que la meta existe
  await getSavingsGoalById(db, userId, goalId);

  const { type, start_date, end_date, limit = 50, offset = 0 } = filters;

  let query = 'SELECT * FROM savings_transactions WHERE savings_goal_id = ? AND user_id = ?';
  const params = [goalId, userId];

  if (type && ['deposit', 'withdrawal'].includes(type)) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (start_date) {
    query += ' AND date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const transactions = await db.prepare(query).bind(...params).all();

  // Contar total
  let countQuery = 'SELECT COUNT(*) as total FROM savings_transactions WHERE savings_goal_id = ? AND user_id = ?';
  const countParams = [goalId, userId];

  if (type && ['deposit', 'withdrawal'].includes(type)) {
    countQuery += ' AND type = ?';
    countParams.push(type);
  }

  if (start_date) {
    countQuery += ' AND date >= ?';
    countParams.push(start_date);
  }

  if (end_date) {
    countQuery += ' AND date <= ?';
    countParams.push(end_date);
  }

  const countResult = await db.prepare(countQuery).bind(...countParams).first();

  return {
    transactions: transactions.results || [],
    total: countResult?.total || 0
  };
}

/**
 * Eliminar una transacción
 */
export async function deleteTransaction(db, userId, goalId, transactionId) {
  // Verificar que la meta existe
  const goal = await getSavingsGoalById(db, userId, goalId);

  // Obtener la transacción
  const transaction = await db.prepare(`
    SELECT * FROM savings_transactions
    WHERE id = ? AND savings_goal_id = ? AND user_id = ?
  `).bind(transactionId, goalId, userId).first();

  if (!transaction) {
    throw new Error('Transacción no encontrada');
  }

  // Eliminar transacción
  const result = await db.prepare(`
    DELETE FROM savings_transactions
    WHERE id = ? AND savings_goal_id = ? AND user_id = ?
  `).bind(transactionId, goalId, userId).run();

  if (!result.success) {
    throw new Error('Error al eliminar la transacción');
  }

  // Revertir el monto en la meta
  const newAmount = transaction.type === 'deposit'
    ? goal.current_amount - transaction.amount
    : goal.current_amount + transaction.amount;

  await db.prepare(`
    UPDATE savings_goals
    SET current_amount = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(newAmount, goalId, userId).run();

  return { message: 'Transacción eliminada exitosamente' };
}

/**
 * Obtener resumen de ahorros
 */
export async function getSavingsSummary(db, userId) {
  // Total ahorrado (todas las metas activas)
  const activeSummary = await db.prepare(`
    SELECT
      COUNT(*) as active_goals,
      SUM(current_amount) as total_saved,
      SUM(target_amount) as total_target
    FROM savings_goals
    WHERE user_id = ? AND status = 'active'
  `).bind(userId).first();

  // Metas completadas
  const completedCount = await db.prepare(`
    SELECT COUNT(*) as completed_goals
    FROM savings_goals
    WHERE user_id = ? AND status = 'completed'
  `).bind(userId).first();

  // Meta más cercana a completarse
  const nearestGoal = await db.prepare(`
    SELECT
      id, name, current_amount, target_amount,
      ROUND((current_amount * 100.0 / target_amount), 2) as progress_percentage
    FROM savings_goals
    WHERE user_id = ? AND status = 'active' AND target_amount > 0
    ORDER BY progress_percentage DESC
    LIMIT 1
  `).bind(userId).first();

  return {
    active_goals: activeSummary?.active_goals || 0,
    completed_goals: completedCount?.completed_goals || 0,
    total_saved: activeSummary?.total_saved || 0,
    total_target: activeSummary?.total_target || 0,
    nearest_goal: nearestGoal || null
  };
}
