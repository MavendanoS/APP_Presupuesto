# Troubleshooting - APP Presupuesto

Problemas comunes y sus soluciones documentadas para referencia futura.

---

## 🚨 Deployments de Preview (DEV) retornan 404

### Problema
Después de hacer deploy a Preview/DEV con wrangler, la URL del deployment retorna "No se encuentra esta página" (404):
- `https://[deployment-id].app-presupuesto.pages.dev` → 404
- `https://dev.app-presupuesto.pages.dev` → 404

**Síntoma**: PROD funciona correctamente, pero Preview deployments no.

### Causa Raíz
Angular 17+ genera los archivos compilados en `dist/frontend/browser/` en lugar de `dist/frontend/`.

Cuando ejecutas:
```bash
npx wrangler pages deploy dist/frontend --project-name=app-presupuesto --branch=dev
```

Wrangler sube el contenido de `dist/frontend/`, que solo contiene:
- `3rdpartylicenses.txt`
- `prerendered-routes.json`
- Directorio `browser/` (pero no su contenido)

**Los archivos reales** (index.html, JS, CSS, _redirects) están dentro de `dist/frontend/browser/`.

### Solución ✅

**Siempre deployar desde `dist/frontend/browser/`:**

```bash
# ❌ INCORRECTO
npx wrangler pages deploy dist/frontend --project-name=app-presupuesto --branch=dev

# ✅ CORRECTO
npx wrangler pages deploy dist/frontend/browser --project-name=app-presupuesto --branch=dev
```

### Comandos Completos de Deploy

**PROD (main branch):**
```bash
cd frontend
npm run build
npx wrangler pages deploy dist/frontend/browser --project-name=app-presupuesto --commit-dirty=true
```

**DEV (dev branch):**
```bash
cd frontend
npm run build
npx wrangler pages deploy dist/frontend/browser --project-name=app-presupuesto --branch=dev --commit-dirty=true
```

### Verificación Rápida

Antes de deployar, verifica que estás en la carpeta correcta:

```bash
ls frontend/dist/frontend/browser/
```

Deberías ver:
- `index.html`
- `_redirects`
- Archivos `.js` (chunk-*.js, main-*.js, polyfills-*.js)
- Archivos `.css` (styles-*.css)

Si **NO** ves estos archivos, estás en la carpeta incorrecta.

---

## Fecha de Documentación
**Creado**: 2025-11-22
**Última Actualización**: 2025-11-22
