# Architecture Report — Sistema Baterías al Costo

## Stack
- **Backend**: Node.js + Express (ES Modules)
- **Frontend**: React + Vite + Tailwind
- **DB**: MySQL 8+ (mysql2/promise)
- **Auth**: JWT (jsonwebtoken)

## Backend Structure

```
backend/
├── app.js                          # Entry point, middleware, routes
├── servidor.js                     # Bootstrap + DB connection check
├── configuracion/
│   ├── index.js                    # Config centralizada (dotenv)
│   └── baseDeDatos.js             # MySQL pool
├── middleware/
│   ├── autenticacion.js            # JWT verification
│   └── permisos.js                 # RBAC middleware
├── controladores/
│   ├── ControladorUsuarios.js      # Login, perfil, CRUD usuarios
│   ├── ControladorInventario.js    # POS productos, categorías, kardex
│   ├── ControladorInventarioLegacy.js  # Legacy inventario_baterias/varios
│   ├── ControladorCaja.js          # Sesiones caja, arqueos
│   ├── ControladorVentasMultiItem.js  # Ventas POS multi-item
│   ├── ControladorComprasMultiItem.js # Compras POS multi-item
│   ├── ControladorFacturaLegacy.js # Facturación local/legacy
│   ├── ControladorFacturaSRI.js    # Facturación SRI (Datil)
│   ├── ControladorDashboard.js     # Dashboard KPIs
│   ├── ControladorInformes.js      # Informes con legacy ops
│   ├── ControladorReportes.js      # Reportes PDF/excel
│   ├── ControladorRoles.js         # CRUD roles + permisos
│   └── ControladorOperacionesInventario.js # Legacy ops
├── modelos/
│   ├── Usuario.js                  # usuarios + bcrypt
│   ├── Rol.js                      # roles + rol_permisos (relacional)
│   ├── Venta.js                    # ventas + detalle_ventas (transaccional)
│   ├── Compra.js                   # compras + detalle_compras (transaccional)
│   ├── Producto.js                 # productos + categorías
│   ├── Caja.js                     # cajas + sesiones_caja + movimientos_caja
│   ├── FacturaLegacy.js            # facturas (dual: venta_id o venta_pos_id)
│   ├── MovimientoInventario.js     # movimientos_inventario + inventario_stock
│   ├── InventarioBateria.js        # Legacy tabla inventario_baterias
│   ├── InventarioVario.js          # Legacy tabla inventario_varios
│   ├── OperacionesInventario.js    # Legacy operaciones
│   ├── Dashboard.js                # KPIs agregados
│   ├── Reporte.js                  # Reportes SQL
│   └── Auditoria.js                # Log de auditoría
├── rutas/                          # Routes (ver app.js imports)
├── servicios/
│   └── datilService.js             # API Datil (SRI)
└── utilidades/
    ├── logger.js                   # Logger centralizado
    ├── jwtUsuario.js               # ID helpers for JWT
    └── generarFacturaPDF.js        # PDF generation
```

## Frontend Structure

```
frontend/
└── src/
    ├── App.jsx                     # Router + Sidebar + Layout
    ├── main.jsx                    # React entry point
    ├── componentes/                # Reusable UI components
    │   ├── Button.jsx, Input.jsx, Select.jsx, Modal.jsx
    │   ├── FormularioVentaMultiItem.jsx
    │   ├── FormularioCompraMultiItem.jsx
    │   ├── Autocomplete.jsx, Badge.jsx, Paginacion.jsx
    ├── hooks/                      # Custom hooks
    │   ├── useSesion.js            # Auth state + localStorage
    │   ├── useMultiItem.js         # Multi-item CRUD
    │   ├── usePaginacion.js
    │   └── useVista*.js            # One hook per page
    ├── paginas/                    # Page components
    ├── servicios/
    │   ├── servicios.js            # Axios instance + interceptors
    │   └── operacionesService.js   # Legacy operations API
    └── utilidades/
        ├── errorApi.js             # Error message helper
        └── permisosCliente.js      # Client-side permission check
```

## Data Flow
```
Cliente → (React) → Axios (JWT en localStorage) → Express → Controlador → Modelo (pool.query) → MySQL
                                                                  ↕
                                                              Logger (audit trail)
                                                                  ↕
                                                              Auditoria (DB table)
```

## Key Flows
1. **Login**: POST `/api/login` → verificar credenciales → generar JWT → almacenar en localStorage
2. **Venta POS**: Validar caja abierta → insertar venta + detalle_ventas → rebajar stock (FOR UPDATE) → registrar movimiento caja → commit transaccional
3. **Facturación**: Crear factura (venta_pos_id FK a ventas) → emisión SRI (Datil) → actualizar estado
4. **Caja**: Abrir sesión → registrar ingresos/egresos → arqueo → cerrar sesión

## Issues
- Dual inventory (legacy `inventario_baterias` vs POS `productos`)
- JWT en localStorage (XSS vulnerable)
- Facturación con FK dual (`venta_id` legacy + `venta_pos_id` POS)
