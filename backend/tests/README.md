# Testing del Backend

## Configuración

Estos tests utilizan archivos `.http` que pueden ejecutarse con:
- VS Code REST Client extension
- IntelliJ HTTP Client
- Cualquier herramienta compatible con archivos HTTP

## Variables Globales

Los archivos usan variables que se actualizan durante el testing:
- `@baseUrl`: URL del Worker (local: http://localhost:8787)
- `@token`: JWT token obtenido del login

## Orden de Ejecución

1. **auth.test.http**: Autenticación (register, login, me)
2. **categories.test.http**: Gestión de categorías
3. **expenses.test.http**: Gestión de gastos
4. **income.test.http**: Gestión de ingresos

## Ejecutar Worker Localmente

```bash
cd backend
npm run dev
# Worker disponible en http://localhost:8787
```

## Resultados

Los resultados de las pruebas se documentan en `RESULTS.md`
