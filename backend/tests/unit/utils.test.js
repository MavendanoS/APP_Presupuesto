import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addMonths, currentYearMonth, todayInChile, isValidYearMonth, isValidDate } from '../../src/utils/dates.js';
import { parseAmount, parseOptionalAmount, parseBoolean, sanitizeNotes } from '../../src/utils/validators.js';
import { parseIdList, MAX_IDS } from '../../src/utils/ids.js';
import { HttpError, errorResponse, readJson } from '../../src/utils/http.js';

test('addMonths cruza años en ambas direcciones', () => {
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-03', -14), '2025-01');
  assert.equal(addMonths('2026-05', 0), '2026-05');
});

test('fechas "de hoy" se calculan en hora de Chile, no UTC', () => {
  // 2026-05-01 02:00 UTC = 2026-04-30 22:00 en Chile (UTC-4)
  const lateNightInChile = new Date('2026-05-01T02:00:00Z');
  assert.equal(todayInChile(lateNightInChile), '2026-04-30');
  assert.equal(currentYearMonth(lateNightInChile), '2026-04');
});

test('isValidYearMonth / isValidDate', () => {
  assert.ok(isValidYearMonth('2026-09'));
  assert.ok(!isValidYearMonth('2026-13'));
  assert.ok(!isValidYearMonth('0001-01'));
  assert.ok(!isValidYearMonth(202609));

  assert.ok(isValidDate('2024-02-29'));
  assert.ok(!isValidDate('2025-02-29'));
  assert.ok(!isValidDate('2026-09-25T10:00:00Z'));
  assert.ok(!isValidDate('mañana'));
});

test('parseAmount rechaza texto, cero, negativos y no finitos', () => {
  assert.equal(parseAmount(1500), 1500);
  assert.equal(parseAmount('1500.5'), 1500.5);
  for (const bad of ['abc', '', ' ', 0, -1, null, undefined, true, Infinity, NaN, {}]) {
    assert.throws(() => parseAmount(bad), `debería rechazar ${String(bad)}`);
  }
});

test('parseOptionalAmount permite null y 0', () => {
  assert.equal(parseOptionalAmount(null), null);
  assert.equal(parseOptionalAmount(''), null);
  assert.equal(parseOptionalAmount(0), 0);
  assert.throws(() => parseOptionalAmount(-5));
  assert.throws(() => parseOptionalAmount('x'));
});

test('parseBoolean es estricto', () => {
  assert.equal(parseBoolean('false'), false);
  assert.equal(parseBoolean(1), true);
  assert.throws(() => parseBoolean('quizás'));
});

test('sanitizeNotes limita el largo', () => {
  assert.equal(sanitizeNotes('  hola  '), 'hola');
  assert.equal(sanitizeNotes('   '), null);
  assert.throws(() => sanitizeNotes('x'.repeat(501)));
});

test('parseIdList filtra inválidos, deduplica y limita', () => {
  assert.equal(parseIdList(null), null);
  assert.deepEqual(parseIdList('3,1,abc,3,-2'), [3, 1]);
  assert.deepEqual(parseIdList([5, '6']), [5, 6]);
  const tooMany = Array.from({ length: MAX_IDS + 1 }, (_, i) => i + 1);
  assert.throws(() => parseIdList(tooMany));
});

test('errorResponse usa el status de HttpError y oculta errores internos', async () => {
  const notFound = errorResponse(new HttpError(404, 'No existe'), 'Error X');
  assert.equal(notFound.status, 404);
  assert.deepEqual(await notFound.json(), { error: 'Error X', message: 'No existe' });

  const validation = errorResponse(new Error('Monto inválido'), 'Error X');
  assert.equal(validation.status, 400);

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const internal = errorResponse(new Error('D1_ERROR: no such column: foo'), 'Error X');
    assert.equal(internal.status, 500);
    assert.equal((await internal.json()).message, 'Error interno del servidor');
  } finally {
    console.error = originalConsoleError;
  }
});

test('readJson rechaza cuerpos inválidos con 400', async () => {
  const bad = new Request('https://x/', { method: 'POST', body: 'no-json' });
  await assert.rejects(readJson(bad), err => err instanceof HttpError && err.status === 400);

  const good = new Request('https://x/', { method: 'POST', body: '{"a":1}' });
  assert.deepEqual(await readJson(good), { a: 1 });
});
