import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword } from '../../src/utils/hash.js';
import { createToken, verifyToken } from '../../src/utils/jwt.js';
import { changeUserPassword, reAuthenticateUser, updateUserProfile } from '../../src/services/authService.js';
import { authMiddleware } from '../../src/middleware/auth.js';

/**
 * D1 falso mínimo: una tabla users en memoria.
 * Responde a las consultas que usan authService y el middleware.
 */
function createFakeDb(users) {
  const statement = (sql, params = []) => ({
    bind: (...args) => statement(sql, args),
    async first() {
      if (/FROM users\s+WHERE id = \?/.test(sql)) {
        const user = users.find(u => u.id === params[0]);
        if (!user) return null;
        if (/password_changed_at/.test(sql) && !/password_hash/.test(sql)) {
          return { password_changed_at: user.password_changed_at ?? null };
        }
        const { password_hash, password_changed_at, ...publicUser } = user;
        return /password_hash/.test(sql) ? { ...publicUser, password_hash } : publicUser;
      }
      if (/FROM users\s+WHERE LOWER\(email\)/.test(sql)) {
        return users.find(u => u.email.toLowerCase() === String(params[0]).toLowerCase()) || null;
      }
      throw new Error(`SQL no soportado en el fake: ${sql}`);
    },
    async run() {
      if (/UPDATE users\s+SET password_hash/.test(sql)) {
        const user = users.find(u => u.id === params[1]);
        user.password_hash = params[0];
        if (/password_changed_at = unixepoch\(\)/.test(sql)) {
          user.password_changed_at = Math.floor(Date.now() / 1000);
        }
        return { success: true, meta: { changes: 1 } };
      }
      if (/UPDATE users\s+SET name = \?, email = \?/.test(sql)) {
        const user = users.find(u => u.id === params[2]);
        user.name = params[0];
        user.email = params[1];
        return { success: true, meta: { changes: 1 } };
      }
      throw new Error(`SQL no soportado en el fake: ${sql}`);
    }
  });

  return { prepare: sql => statement(sql) };
}

async function setup() {
  const users = [{
    id: 1,
    email: 'ana@example.com',
    name: 'Ana',
    language: 'es',
    currency: 'CLP',
    created_at: '2026-01-01',
    password_hash: await hashPassword('secreto-actual'),
    password_changed_at: null
  }];
  return { users, db: createFakeDb(users) };
}

test('verifyPassword devuelve isValid=false sin lanzar si falta el hash', async () => {
  assert.deepEqual(await verifyPassword('x', undefined), { isValid: false, needsRehash: false });
});

test('changeUserPassword rechaza una contraseña actual incorrecta', async () => {
  const { db, users } = await setup();
  const originalHash = users[0].password_hash;

  await assert.rejects(
    changeUserPassword(db, 1, { currentPassword: 'incorrecta', newPassword: 'nueva-clave-123' }),
    /Contraseña actual incorrecta/
  );
  assert.equal(users[0].password_hash, originalHash, 'el hash no debe cambiar');
});

test('changeUserPassword con la contraseña correcta cambia el hash y revoca sesiones', async () => {
  const { db, users } = await setup();

  await changeUserPassword(db, 1, { currentPassword: 'secreto-actual', newPassword: 'nueva-clave-123' });

  assert.ok((await verifyPassword('nueva-clave-123', users[0].password_hash)).isValid);
  assert.ok(users[0].password_changed_at > 0);
});

test('reAuthenticateUser valida contra el hash real', async () => {
  const { db } = await setup();
  assert.equal(await reAuthenticateUser(db, 1, 'secreto-actual'), true);
  assert.equal(await reAuthenticateUser(db, 1, 'otra'), false);
});

test('updateUserProfile exige contraseña para cambiar el email', async () => {
  const { db, users } = await setup();

  await assert.rejects(
    updateUserProfile(db, 1, { name: 'Ana', email: 'nuevo@example.com' }),
    /contraseña actual/
  );
  await assert.rejects(
    updateUserProfile(db, 1, { name: 'Ana', email: 'nuevo@example.com', currentPassword: 'mala' }),
    /Contraseña incorrecta/
  );

  // Cambiar solo el nombre no requiere contraseña
  await updateUserProfile(db, 1, { name: 'Ana María', email: 'ana@example.com' });
  assert.equal(users[0].name, 'Ana María');

  await updateUserProfile(db, 1, { name: 'Ana María', email: 'nuevo@example.com', currentPassword: 'secreto-actual' });
  assert.equal(users[0].email, 'nuevo@example.com');
});

test('JWT: firma, alg y revocación por cambio de contraseña', async () => {
  const secret = 'test-secret';
  const { db, users } = await setup();
  const env = { JWT_SECRET: secret, DB: db };
  const token = await createToken({ userId: 1, email: 'ana@example.com' }, secret);
  const request = () => new Request('https://api/', { headers: { Cookie: `auth_token=${token}` } });

  assert.equal((await verifyToken(token, secret)).userId, 1);
  await assert.rejects(verifyToken(token, 'otro-secreto'));

  assert.equal((await authMiddleware(request(), env)).isAuthenticated, true);

  // Un cambio de contraseña posterior a la emisión revoca el token
  users[0].password_changed_at = Math.floor(Date.now() / 1000) + 1;
  const revoked = await authMiddleware(request(), env);
  assert.equal(revoked.isAuthenticated, false);
});
