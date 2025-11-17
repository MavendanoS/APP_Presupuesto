# APP Presupuesto

PWA para gestión de gastos personales con Angular + Cloudflare D1

## 🚀 Características

- ✅ Sistema de autenticación JWT
- ✅ Gestión de gastos (pagos, compras, gastos hormiga)
- ✅ Control de ingresos y sueldo
- ✅ Dashboard con gráficos estadísticos
- ✅ Predicciones inteligentes
- ✅ Exportación de reportes (CSV, Excel)
- ✅ PWA instalable
- ✅ 100% Responsivo (Mobile, Tablet, Desktop)
- ✅ Formato moneda chilena (CLP)

## 🛠️ Stack Tecnológico

- **Frontend**: Angular 17+ con Bootstrap 5
- **Backend**: Cloudflare Workers
- **Base de datos**: Cloudflare D1 (SQLite)
- **Autenticación**: JWT
- **Deploy**: Cloudflare Pages + Workers

## 📂 Estructura del Proyecto

```
APP_Presupuesto/
├── frontend/          # Angular PWA
├── backend/           # Cloudflare Worker (API)
├── database/          # Esquemas SQL y migraciones
└── README.md
```

## 🚀 Quick Start

### Backend

```bash
cd backend
npm install
wrangler dev
```

### Frontend

```bash
cd frontend
npm install
ng serve
```

### Base de datos

```bash
# Crear base de datos D1
wrangler d1 create gastos-db

# Ejecutar schema
wrangler d1 execute gastos-db --file=../database/schema.sql
```

## 📱 Diseño Responsivo

- **Mobile** (< 768px): Menú hamburguesa, cards apiladas
- **Tablet** (768px - 1199px): Sidebar colapsable, grid 2 columnas
- **Desktop** (≥ 1200px): Sidebar fija, grid 3 columnas

## 🔐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login (retorna JWT)
- `GET /api/auth/me` - Usuario actual

### Gastos
- `GET /api/expenses` - Listar gastos
- `POST /api/expenses` - Crear gasto
- `PUT /api/expenses/:id` - Actualizar gasto
- `DELETE /api/expenses/:id` - Eliminar gasto

### Analytics
- `GET /api/analytics/dashboard` - Dashboard principal
- `GET /api/analytics/charts` - Datos para gráficos
- `GET /api/analytics/predictions` - Predicciones

### Exportación
- `GET /api/export/csv` - Exportar a CSV
- `GET /api/export/excel` - Exportar a Excel

## 📄 Licencia

MIT
