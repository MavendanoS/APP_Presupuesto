# Testing del Backend

## Tests unitarios (automáticos)

Usan el runner nativo de Node (`node:test`), sin dependencias extra:

```bash
cd backend
npm test
```

- `unit/utils.test.js`: fechas (hora de Chile), validadores de montos/IDs, respuestas de error.
- `unit/auth.test.js`: cambio de contraseña, re-autenticación, cambio de email y revocación de JWT
  (con un D1 falso en memoria).

## Pruebas manuales contra el Worker local

```bash
cd backend
npm run db:schema:local   # crea el esquema v4 en la D1 local
npm run dev               # Worker en http://localhost:8787
```

`wrangler dev` necesita `backend/.dev.vars` (no se versiona) con al menos:

```
JWT_SECRET="un-secreto-local-largo"
ENVIRONMENT="development"
```

`api/auth.test.http` contiene requests de ejemplo para VS Code REST Client / IntelliJ HTTP Client.
