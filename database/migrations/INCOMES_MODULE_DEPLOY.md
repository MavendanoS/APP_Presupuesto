# Módulo de Ingresos — Notas de despliegue

**Fecha:** 2026-04-28
**Cambio:** Agrega registro de ingresos mensuales (sueldo + bonos ocasionales) con saldo y waterfall en el dashboard.

---

## Resumen del cambio

### Backend
- Nueva tabla `monthly_incomes` (modelo simple: descripción + monto + mes, sin catálogo de fuentes).
- Nuevos endpoints REST bajo `/api/incomes` (CRUD + monthly + history + totals-by-month).
- El endpoint `/api/payments/budget` ahora incluye `incomes`, `summary.total_incomes`, `summary.balance` y `summary.projected_balance`.

### Frontend
- Nueva sección `/incomes` con lista mensual + formulario de creación/edición.
- Nueva sección `/history/incomes` con gráfico de evolución y tabla.
- Dashboard rediseñado: card de Ingresos + card de Saldo Proyectado + **gráfico de cascada (waterfall)** con flujo Ingresos → Gastos pagados → Pendientes → Saldo.
- Nuevo link "Ingresos" en la navegación.

---

## Pasos de despliegue (PRODUCCIÓN)

### 1. Aplicar migración SQL en D1 (producción)

```bash
cd backend
npx wrangler d1 execute gastos-db --remote --file=../database/migrations/004-incomes-module.sql
```

Verifica que la tabla se creó:

```bash
npx wrangler d1 execute gastos-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='monthly_incomes';"
```

Debe responder con `monthly_incomes`.

### 2. Desplegar el Worker

```bash
cd backend
npx wrangler deploy
```

Verifica el endpoint nuevo (sustituye TU_TOKEN con tu cookie auth_token o usa el navegador estando logueado):

```bash
curl https://app-presupuesto-api.<tu-subdominio>.workers.dev/api/health
```

### 3. Build y deploy del frontend

```bash
cd frontend
npm run build
npx wrangler pages deploy dist/frontend/browser --project-name=app-presupuesto --branch=main
```

> Nota: tu `package.json` tiene `deploy:dev` que despliega a la rama `dev`. Para producción usa `--branch=main` (o el nombre correcto del environment de prod en tu proyecto Pages).

### 4. Validar en producción

1. Abre https://app-presupuesto.pages.dev
2. Inicia sesión.
3. Ve al menú **Ingresos** (nuevo link).
4. Registra un ingreso de prueba (ej: "Sueldo Abril", $1.500.000, mes actual).
5. Vuelve al **Dashboard** y verifica:
   - La card "Ingresos" muestra el total.
   - La card "Saldo Proyectado" muestra `Ingresos − Gastos esperados`.
   - El gráfico de cascada muestra el flujo del mes.
6. Ve a **Historial** → revisa que tu historial de pagos sigue funcionando.
7. Ve a la URL `/history/incomes` para ver el historial de ingresos (no hay link directo todavía, opcionalmente añade uno desde el navbar o desde la página de ingresos).

---

## Rollback

Si algo falla en producción:

```bash
# Revertir el deploy del Worker
cd backend
npx wrangler rollback   # selecciona el deploy anterior

# Eliminar la tabla (solo si fuera necesario; los datos se perderían)
npx wrangler d1 execute gastos-db --remote --command="DROP TABLE IF EXISTS monthly_incomes;"
```

Para el frontend, redespliega el commit anterior desde Pages.

---

## Archivos creados / modificados

### Creados (nuevos)
- `database/migrations/004-incomes-module.sql`
- `backend/src/db/monthlyIncomes.js`
- `backend/src/services/monthlyIncomeService.js`
- `backend/src/routes/incomes.js`
- `frontend/src/app/core/models/monthly-income.model.ts`
- `frontend/src/app/core/services/monthly-income.service.ts`
- `frontend/src/app/shared/components/waterfall-chart/{ts,html,scss}`
- `frontend/src/app/incomes/income-list/{ts,html,scss}`
- `frontend/src/app/incomes/income-form/{ts,html,scss}`
- `frontend/src/app/history/income-history/{ts,html,scss}`

### Modificados
- `backend/src/index.js` — registrar router de incomes
- `backend/src/services/monthlyPaymentService.js` — incluir ingresos en budget summary
- `frontend/src/app/core/models/index.ts` — exportar nuevo modelo
- `frontend/src/app/core/models/monthly-payment.model.ts` — extender BudgetSummary
- `frontend/src/app/app.routes.ts` — rutas /incomes y /history/incomes
- `frontend/src/app/shared/components/navbar/navbar.component.ts` — nuevo link
- `frontend/src/app/dashboard/dashboard.component.{ts,html}` — waterfall + saldo
- `frontend/public/i18n/{es,en}.json` — traducciones nuevas

---

## Decisiones de diseño

1. **Modelo simple sin catálogo de fuentes.** Cada ingreso tiene `description` libre. Pensado para tu caso de uso (sueldo + bonos ocasionales). Si más adelante quieres recurrencia, se puede agregar después sin romper datos existentes.
2. **No se modificaron las tablas de pagos.** El módulo de ingresos es totalmente aditivo; si llegara a fallar, los pagos siguen funcionando exactamente igual.
3. **Waterfall:** implementado con Chart.js (`bar` con barras flotantes) + plugin custom para etiquetas y líneas conectoras. No requiere dependencias nuevas.
4. **Endpoint `/api/payments/budget` extendido.** Para que el dashboard cargue todo en una sola llamada, en vez de dos.
