# Sistema Baterías al Costo

Sistema web para un local de compra/venta de baterías de carro y compra de baterías usadas (chatarra).
Incluye inventario, ventas, compras, caja, usuarios/roles, reportes y facturación (PDF). La facturación electrónica SRI es opcional.

## Tecnologías

- Backend: Node.js + Express + MySQL (mysql2)
- Frontend: React + Vite
- Autenticación: JWT
- Permisos: roles + permisos (RBAC)
- Facturas: PDF con logo

## Estructura del proyecto (MVC)

```text
backend/
  configuracion/   Conexión MySQL, variables y config
  modelos/         Acceso a datos (SQL) y reglas de datos
  controladores/   Lógica de negocio por módulo (request/response)
  rutas/           Endpoints REST
  middleware/      JWT, permisos, validaciones
  utilidades/      Helpers (PDF, formatos, etc.)
  servicios/       Integraciones externas (SRI/Dátil, etc.)

frontend/
  src/paginas/     Pantallas
  src/hooks/       Lógica de cada pantalla
  src/servicios/   Cliente HTTP (axios)
  src/componentes/ UI reutilizable
  public/          Logos e imágenes

database/
  esquema.sql      Base de datos (tablas/relaciones)
  semilla.sql      Datos iniciales (roles/usuario admin/permiso)

docs/              Documentación y archivos de referencia
```

## Requisitos

- Node.js (LTS recomendado)
- MySQL o MariaDB (local o en contenedor)
- Windows PowerShell (si estás en Windows)

## Configuración (.env)

Este proyecto usa un archivo `.env` en la raíz para variables del backend.
Si ves caracteres raros en tu `.env`, ábrelo con VS Code y guárdalo como `UTF-8`.

Variables típicas:

```text
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sistema_baterias
DB_USER=root
DB_PASS=tu_clave

JWT_SECRET=...
JWT_EXPIRES_IN=8h

PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Base de datos (crear y cargar)

1. Crea la base `sistema_baterias` en tu MySQL.
2. Ejecuta los scripts:

```text
database/esquema.sql
database/semilla.sql
```

## Instalar y ejecutar (desarrollo)

Desde la raíz del proyecto:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Usuario administrador (por defecto)

Si cargaste `database/semilla.sql`, el acceso inicial es:

```text
Usuario: admin
Clave:   admin123
```

## Facturación (PDF)

- Generador: `backend/utilidades/generarFacturaPDF.js`
- Logo para factura: `frontend/public/logoParaFactura.png`

## Reportes

Reportes diarios/semanales/mensuales desde la pantalla de reportes.
Los filtros de fecha se manejan en hora local para evitar descuadres por UTC.

## Problemas comunes

- MySQL no inicia / puerto ocupado: revisa que el puerto `3306` no esté usado por otro MySQL/MariaDB.
- Backend no levanta (puerto 3000 ocupado): cambia `PORT` en `.env` o libera el puerto.
- El login da `500`: normalmente es backend apagado o variables DB mal configuradas.
- “Acceso denegado” en una pantalla: revisa permisos del rol del usuario en la BD (tabla `rol_permisos`).

## Scripts útiles

- Desarrollo (backend + frontend): `npm run dev`
- Solo backend: `npm run start:backend`
- Build frontend: `npm run build:frontend`
