# Migraciones de Base de Datos

## Orden de ejecución

1. **add-category-user-fields.sql** - Añade campos `is_standard` y permite `user_id` NULL
2. **fix-duplicate-categories.sql** - ⚠️ **NUEVA** - Limpia categorías duplicadas
3. **add-savings-module.sql** - Añade módulo de ahorros

## Problema corregido: Categorías duplicadas

### Descripción del problema
Al crear nuevos usuarios, se creaban categorías específicas para cada usuario (con `user_id` del usuario), duplicando las categorías transversales que deberían ser compartidas por todos los usuarios.

### Solución implementada
1. **authService.js**: Eliminada la función `createDefaultCategories` que duplicaba categorías por usuario
2. **schema.sql**: Actualizado para incluir categorías transversales (`user_id = NULL`, `is_standard = 1`)
3. **fix-duplicate-categories.sql**: Migración que limpia categorías duplicadas existentes

## Ejecutar migraciones

### Producción (Cloudflare)
```bash
cd backend

# 1. Aplicar migración de campos (si no se ha aplicado)
npx wrangler d1 execute gastos-db --file=migrations/add-category-user-fields.sql

# 2. Limpiar categorías duplicadas (NUEVA MIGRACIÓN)
npx wrangler d1 execute gastos-db --file=migrations/fix-duplicate-categories.sql

# 3. Aplicar módulo de ahorros (si no se ha aplicado)
npx wrangler d1 execute gastos-db --file=migrations/add-savings-module.sql
```

### Local (desarrollo)
```bash
cd backend

# 1. Aplicar migración de campos
npx wrangler d1 execute gastos-db --local --file=migrations/add-category-user-fields.sql

# 2. Limpiar categorías duplicadas
npx wrangler d1 execute gastos-db --local --file=migrations/fix-duplicate-categories.sql

# 3. Aplicar módulo de ahorros
npx wrangler d1 execute gastos-db --local --file=migrations/add-savings-module.sql
```

## Verificar resultado

Después de ejecutar `fix-duplicate-categories.sql`, los usuarios deberían ver:
- ✅ **Solo** categorías transversales (las 12 estándar)
- ✅ Categorías personalizadas que hayan creado ellos mismos
- ❌ **NO** duplicados de las categorías estándar con su user_id

### Query de verificación
```sql
-- Ver categorías estándar (deben tener user_id = NULL, is_standard = 1)
SELECT * FROM expense_categories WHERE is_standard = 1;

-- Ver categorías por usuario (deben ser solo las que creó el usuario)
SELECT * FROM expense_categories WHERE user_id = 1;

-- Verificar que no hay duplicados (este query NO debe retornar nada)
SELECT ec1.*, ec2.name as standard_name
FROM expense_categories ec1
JOIN expense_categories ec2 ON ec1.name = ec2.name
WHERE ec1.user_id IS NOT NULL
  AND ec2.user_id IS NULL
  AND ec2.is_standard = 1
  AND ec1.is_standard = 0;
```

## Comportamiento nuevo (después de la corrección)

### Al crear un nuevo usuario
1. **NO** se crean categorías específicas para el usuario
2. El usuario ve las 12 categorías transversales automáticamente
3. El usuario puede crear sus propias categorías personalizadas

### Al cargar categorías
El query en `getCategories()` retorna:
```sql
WHERE (is_standard = 1 OR user_id = ?)
```
Esto muestra:
- Todas las categorías estándar (`is_standard = 1`)
- Solo las categorías personalizadas del usuario (`user_id = ?`)
