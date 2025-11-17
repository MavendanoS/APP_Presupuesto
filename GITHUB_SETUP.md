# Instrucciones para Subir el Proyecto a GitHub

## Paso 1: Crear el Repositorio en GitHub

1. Ve a [GitHub](https://github.com)
2. Haz clic en el botón **"New"** (o el ícono `+` → "New repository")
3. Configura el repositorio:
   - **Repository name**: `APP_Presupuesto` (o el nombre que prefieras)
   - **Description**: "PWA de gestión de gastos personales con Angular y Cloudflare D1"
   - **Visibility**: Public o Private (según tu preferencia)
   - **NO marques** "Initialize this repository with":
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license

   (Esto es importante porque ya tenemos estos archivos localmente)

4. Haz clic en **"Create repository"**

## Paso 2: Conectar el Repositorio Local con GitHub

GitHub te mostrará instrucciones. Usa estas (la segunda opción: "push an existing repository"):

```bash
# Agregar el remote de GitHub (reemplaza TU-USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU-USUARIO/APP_Presupuesto.git

# Verificar que se agregó correctamente
git remote -v

# Deberías ver algo como:
# origin  https://github.com/TU-USUARIO/APP_Presupuesto.git (fetch)
# origin  https://github.com/TU-USUARIO/APP_Presupuesto.git (push)
```

## Paso 3: Subir las Ramas a GitHub

```bash
# Primero, asegúrate de estar en la rama dev
git branch
# Debería mostrar: * dev

# Subir la rama main
git push -u origin main

# Subir la rama dev (la rama actual)
git push -u origin dev

# Verificar que ambas ramas se subieron
git branch -a
# Debería mostrar:
#   main
# * dev
#   remotes/origin/main
#   remotes/origin/dev
```

## Paso 4: Configurar la Rama Principal en GitHub (Opcional)

Si quieres que `dev` sea la rama principal para desarrollo:

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings**
3. En el menú lateral, haz clic en **Branches**
4. En "Default branch", cambia de `main` a `dev`
5. Confirma el cambio

## Paso 5: Verificar que Todo se Subió Correctamente

En GitHub, deberías ver:
- ✅ 2 ramas: `main` y `dev`
- ✅ 2 commits:
  - "feat: estructura inicial del proyecto - backend y database configurados"
  - "feat(backend): sistema de autenticación JWT completo"
- ✅ Todos los archivos del proyecto
- ✅ El README.md se muestra en la página principal

## Estructura de Trabajo con Git

### Flujo de Trabajo Recomendado

```bash
# Siempre trabaja en la rama dev
git checkout dev

# Hacer cambios en archivos...

# Ver qué archivos cambiaron
git status

# Agregar cambios al staging area
git add .

# Hacer commit con mensaje descriptivo
git commit -m "feat: descripción del cambio"

# Subir cambios a GitHub
git push origin dev

# Cuando una fase esté completa y probada, mergear a main
git checkout main
git merge dev
git push origin main

# Volver a dev para seguir trabajando
git checkout dev
```

### Convenciones de Mensajes de Commit

Usamos el formato de [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(alcance): descripción corta

[cuerpo opcional del mensaje]

[footer opcional]
```

**Tipos comunes:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan código)
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**
```bash
git commit -m "feat(backend): agregar endpoint de gastos"
git commit -m "fix(auth): corregir validación de email"
git commit -m "docs: actualizar README con instrucciones"
```

## Comandos Útiles de Git

```bash
# Ver historial de commits
git log --oneline --graph --all

# Ver estado actual
git status

# Ver diferencias antes de commit
git diff

# Ver las ramas
git branch -a

# Cambiar de rama
git checkout nombre-rama

# Crear y cambiar a nueva rama
git checkout -b nueva-rama

# Ver remote configurado
git remote -v

# Actualizar desde GitHub
git pull origin dev
```

## Protección de Datos Sensibles

⚠️ **IMPORTANTE**: El archivo `wrangler.toml` contiene el `JWT_SECRET` y `database_id`.

### Antes de hacer el repositorio público:

1. **Cambiar el JWT_SECRET** en producción:
   ```toml
   [env.production.vars]
   JWT_SECRET = "GENERAR_UN_SECRET_SEGURO_AQUÍ"
   ```

2. **Usar variables de entorno** en producción:
   ```bash
   # En Cloudflare Workers, configurar secrets:
   npx wrangler secret put JWT_SECRET
   # Ingresa el secret cuando te lo pida
   ```

3. **Agregar al .gitignore** (ya está incluido):
   ```
   .dev.vars
   .env
   ```

## Actualizar .gitignore (Opcional)

Si quieres que `wrangler.toml` sea ignorado y usar uno de ejemplo:

1. Crea `wrangler.toml.example`:
   ```toml
   name = "app-presupuesto-api"
   main = "src/index.js"
   compatibility_date = "2024-01-01"

   [vars]
   JWT_SECRET = "YOUR_SECRET_HERE"
   FRONTEND_URL = "http://localhost:4200"

   [[d1_databases]]
   binding = "DB"
   database_name = "gastos-db"
   database_id = "YOUR_DATABASE_ID"
   ```

2. Agrega al `.gitignore`:
   ```
   backend/wrangler.toml
   ```

3. Cada desarrollador copia `wrangler.toml.example` a `wrangler.toml` y configura sus valores.

## Resumen de Comandos para Subir a GitHub

```bash
# 1. Crear repo en GitHub (sin inicializar)

# 2. Conectar repo local
git remote add origin https://github.com/TU-USUARIO/APP_Presupuesto.git

# 3. Subir ambas ramas
git push -u origin main
git push -u origin dev

# ✅ Listo! Tu proyecto está en GitHub
```

---

**Última actualización**: 2025-11-17
