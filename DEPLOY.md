# Deploy

Producción se despliega **automáticamente desde GitHub**: no hace falta ningún PC.

| Rama | Uso |
|------|-----|
| `dev` | Trabajo diario. No despliega. |
| `main` | Producción. Cada push despliega backend + frontend (workflow **Deploy**). |

## Flujo normal

1. Trabajar en `dev` (o en una rama desde `dev`).
2. Si el cambio necesita migración: agregar `database/migrations/NNN-nombre.sql` y aplicarla
   con **Actions → DB migration → Run workflow** (archivo + `APLICAR`) **antes** del paso 3.
3. Llevar `dev` a `main` (merge o PR). El workflow **Deploy** corre tests y despliega.
4. Revisar https://app-presupuesto.pages.dev

## Configuración inicial (una sola vez)

1. Cloudflare → My Profile → API Tokens → Create Token → *Custom token* con permisos:
   - Account → Workers Scripts → Edit
   - Account → Cloudflare Pages → Edit
   - Account → D1 → Edit
2. GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN` = el token del paso 1
   - `CLOUDFLARE_ACCOUNT_ID` = `6e60efc13c5991890716d7a22046d358`

## Volver atrás

- **Código:** revertir el commit en `main` (el deploy corre de nuevo) o, en Cloudflare,
  Workers/Pages → Deployments → Rollback.
- **Datos:** el workflow de migración imprime un *bookmark*. Para restaurar la base a ese punto:
  `npx wrangler d1 time-travel restore gastos-db --bookmark=<bookmark>` (hasta 30 días atrás).
