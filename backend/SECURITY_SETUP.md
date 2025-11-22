# Configuración de Seguridad - APP Presupuesto Backend

## ⚠️ CRÍTICO: Configurar JWT Secret en Producción

El JWT_SECRET es la clave que firma todos los tokens de autenticación. NUNCA debe estar hardcodeado en el código o en el repositorio.

### Paso 1: Generar un Secret Seguro

Ejecuta este comando para generar un secret aleatorio de 512 bits:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Ejemplo de output:**
```
D3fptdyzwuksmY5Nv6uV0ORR9lLPVqlSanr5AUEFgyOASdytdAig8ZpzUelD+2XHu8lRbD2c3wsiBrzk1MnyKQ==
```

⚠️ **IMPORTANTE**: Guarda este valor de forma segura (por ejemplo, en un gestor de contraseñas). Lo necesitarás para configurarlo en Cloudflare.

### Paso 2: Configurar en Cloudflare Dashboard

**Opción A: Usando Cloudflare Dashboard (Recomendado)**

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona tu cuenta → Workers & Pages
3. Encuentra el worker `app-presupuesto-api`
4. Ve a Settings → Variables and Secrets
5. En la sección "Environment Variables", click en "Edit variables"
6. Agrega una nueva variable:
   - **Type**: Secret (no Text)
   - **Variable name**: `JWT_SECRET`
   - **Value**: Pega el secret generado en Paso 1
7. Click "Save"

**Opción B: Usando Wrangler CLI**

```bash
cd backend
npx wrangler secret put JWT_SECRET --env=""
# Cuando te lo pida, pega el secret generado en Paso 1
```

⚠️ **NOTA**: Si ves el error "Binding name 'JWT_SECRET' already in use", es porque existe como variable en lugar de secret. Debes eliminarlo primero desde el dashboard y luego volver a crearlo como Secret.

### Paso 3: Verificar la Configuración

Después de configurar el secret, verifica que está activo:

```bash
cd backend
npx wrangler secret list
```

Deberías ver `JWT_SECRET` en la lista (el valor no se muestra por seguridad).

### Paso 4: Deploy del Worker

Después de configurar el secret, deploy el worker para que use la nueva configuración:

```bash
cd backend
npm run deploy
```

## 🔐 Secrets Actuales Configurados

- **RESEND_API_KEY** ✅ - Configurado para envío de emails
- **JWT_SECRET** ⚠️ - **PENDIENTE DE CONFIGURAR EN PRODUCCIÓN**

## ⚠️ Desarrollo Local

Para desarrollo local, `wrangler.toml` contiene un valor temporal:
```toml
JWT_SECRET = "dev-only-change-in-production-via-dashboard"
```

Este valor es solo para que la aplicación funcione localmente. **NUNCA uses este valor en producción**.

## 🛡️ Mejores Prácticas de Seguridad

1. **Rotación de Secrets**: Cambia el JWT_SECRET cada 6-12 meses
2. **No compartir**: Nunca compartas el JWT_SECRET por email, chat, o cualquier medio inseguro
3. **Backups seguros**: Guarda el JWT_SECRET en un gestor de contraseñas (1Password, Bitwarden, etc.)
4. **Ambiente separado**: Usa secrets diferentes para dev, staging, y production
5. **Logs**: Nunca loguees el JWT_SECRET o los tokens completos

## 📊 Impacto de Seguridad

| Configuración | Riesgo | Impacto |
|---------------|--------|---------|
| JWT_SECRET en código | 🔴 CRÍTICO | Cualquiera con acceso al repo puede falsificar tokens |
| JWT_SECRET débil | 🔴 CRÍTICO | Vulnerable a ataques de fuerza bruta |
| JWT_SECRET en logs | 🟡 ALTO | Exposición del secret si los logs son comprometidos |
| JWT_SECRET como Secret | 🟢 SEGURO | Protegido, encriptado, y no expuesto |

## 🚨 Qué hacer si el Secret se Compromete

Si sospechas que el JWT_SECRET fue expuesto:

1. **Generar nuevo secret inmediatamente**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
   ```

2. **Actualizar en Cloudflare Dashboard**:
   - Ve a Settings → Variables and Secrets
   - Click en "Edit variables"
   - Actualiza el valor de JWT_SECRET
   - Save

3. **Comunicar a usuarios**: Todos los tokens actuales serán invalidados. Los usuarios necesitarán volver a hacer login.

4. **Investigar**: Determina cómo se comprometió el secret y toma medidas para prevenir futuras exposiciones.

## 📝 Checklist de Seguridad

- [ ] JWT_SECRET generado con `crypto.randomBytes(64)`
- [ ] Secret configurado en Cloudflare Dashboard (no en wrangler.toml)
- [ ] Secret guardado de forma segura en gestor de contraseñas
- [ ] Worker deployado con nuevo secret
- [ ] Verificado que el login funciona con nuevo secret
- [ ] Documentado quién tiene acceso al secret en el equipo
- [ ] Configurado calendario de rotación (cada 6-12 meses)

---

**Última Actualización**: 2025-11-21
**Estado**: ⚠️ JWT_SECRET pendiente de configurar en Cloudflare Dashboard
