# Migraciones de base de datos (D1 `gastos-db`)

Todas las migraciones viven en esta carpeta y se aplican **en orden numérico**.
D1 no lleva registro automático de cuáles se aplicaron: anota aquí la fecha
en que cada una se ejecutó en producción.

| # | Archivo | Qué hace | Idempotente | Producción |
|---|---------|----------|-------------|------------|
| 001 | `001-user-preferences.sql` | `users.language`, `users.currency` | No (ALTER) | Aplicada (2025-11) |
| 002 | `002-indicators-cache.sql` | Tabla `indicators_cache` | Sí | Aplicada (2025-11) |
| 003 | `003-payment-tracking.sql` | `payment_services`, `monthly_payments` | Sí | Aplicada (2026-04) |
| 004 | `004-incomes-module.sql` | `monthly_incomes` | Sí | Aplicada (2026-04) |
| 005 | `005-expected-amount.sql` | `payment_services.expected_amount` | No (ALTER) | Aplicada (verificado 2026-09-25) |
| 006 | `006-security-hardening.sql` | `password_reset_tokens`, `rate_limits`, `users.password_changed_at` | Parcial (ALTER al final) | Aplicada (2026-09-25) |

## Base nueva

Para una base vacía (local o un entorno nuevo) usa directamente el esquema completo:

```bash
cd backend
npm run db:schema:local                     # base local de wrangler dev
npx wrangler d1 execute <db> --remote --file=../database/schema.sql   # base remota nueva
```

## Aplicar una migración pendiente en producción

```bash
cd backend
# 1. Respaldo
npx wrangler d1 export gastos-db --remote --output=backup-$(date +%Y%m%d).sql
# 2. Migración
npx wrangler d1 execute gastos-db --remote --file=../database/migrations/006-security-hardening.sql
```

⚠️ La migración 006 debe aplicarse **antes** de desplegar el backend v4.0.1.

## Tablas del modelo anterior

`expenses`, `income`, `expense_categories`, `budget_limits`, `savings_goals` y
`savings_transactions` siguen existiendo en producción pero v4 no las usa.
Se mantienen como respaldo histórico; eliminarlas es una decisión aparte
(hacer `wrangler d1 export` antes).
