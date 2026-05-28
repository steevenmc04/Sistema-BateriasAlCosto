# API Endpoints — Sistema Baterías al Costo

## Autenticación
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/api/login` | Público (rate-limited) | Inicio de sesión |
| GET | `/api/auth/sesion` | Token | Obtener perfil actual |

## Ventas (Multi-Item)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/api/ventas` | `ventas.crear` | Crear venta multi-item |
| GET | `/api/ventas` | `ventas.ver` | Listar ventas (filtros) |
| GET | `/api/ventas/:id` | `ventas.ver` | Obtener venta por ID |
| DELETE | `/api/ventas/:id` | `ventas.anular` | Anular venta |

## Compras (Multi-Item)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/api/compras` | `compras.crear` | Crear compra multi-item |
| GET | `/api/compras` | `compras.ver` | Listar compras (filtros) |
| GET | `/api/compras/:id` | `compras.ver` | Obtener compra por ID |
| DELETE | `/api/compras/:id` | `compras.crear` | Anular compra |

## Chatarra (Multi-Item)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/api/chatarra` | `inventario.crear` | Crear operación chatarra multi-item |
| GET | `/api/chatarra` | `inventario.ver` | Listar operaciones (filtros) |
| GET | `/api/chatarra/:id` | `inventario.ver` | Obtener operación por ID |
| DELETE | `/api/chatarra/:id` | `inventario.eliminar` | Anular operación |

## Inventario POS
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/inventario` | `inventario.ver` | Listar productos |
| GET | `/api/inventario/:id` | `inventario.ver` | Obtener producto |
| POST | `/api/inventario` | `inventario.crear` | Crear producto |
| PUT | `/api/inventario/:id` | `inventario.editar` | Actualizar producto |
| DELETE | `/api/inventario/:id` | `inventario.eliminar` | Desactivar producto |
| GET | `/api/inventario/kardex` | `inventario.ver` | Listar Kardex |
| POST | `/api/inventario/ajustes` | `inventario.crear` | Ajuste manual inventario |

## Inventario Legacy
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/inventario/baterias` | `inventario.ver` | Listar baterías legacy |
| POST | `/api/inventario/baterias` | `inventario.crear` | Crear batería legacy |
| GET | `/api/inventario/varios` | `inventario.ver` | Listar varios legacy |
| POST | `/api/inventario/varios` | `inventario.crear` | Crear varios legacy |

## Caja
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/caja/estado` | `ventas.ver` | Estado caja actual |
| POST | `/api/caja/abrir` | `ventas.crear` | Abrir sesión caja |
| POST | `/api/caja/cerrar` | `ventas.crear` | Cerrar sesión caja |
| GET | `/api/caja/sesiones` | `ventas.ver` | Listar sesiones |
| GET | `/api/caja/sesiones/:id` | `ventas.ver` | Detalle sesión |
| POST | `/api/caja/movimientos` | `ventas.crear` | Movimiento manual |

## Facturación
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/facturas` | `facturacion_ver` | Listar facturas |
| POST | `/api/facturas` | `facturacion_emitir` | Crear factura |
| GET | `/api/facturas/:id` | `facturacion_ver` | Obtener factura |
| PATCH | `/api/facturas/:id/anular` | `facturacion_anular` | Anular factura |
| GET | `/api/facturas/:id/pdf` | `facturacion_ver` | Descargar PDF |
| GET | `/api/facturas/config` | `facturacion_ver` | Config empresa |
| PUT | `/api/facturas/config` | `facturacion_emitir` | Actualizar config |
| POST | `/api/facturas/:id/sri` | `facturacion_emitir` | Enviar al SRI |

## Usuarios
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/usuarios` | Admin | Listar usuarios |
| POST | `/api/usuarios` | Admin | Crear usuario |
| PUT | `/api/usuarios/:id` | Admin | Actualizar usuario |
| PUT | `/api/usuarios/:id/clave` | Admin | Cambiar clave |

## Roles
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/roles` | `roles_admin` | Listar roles |
| POST | `/api/roles` | `roles_admin` | Crear rol |
| PUT | `/api/roles/:id` | `roles_admin` | Actualizar rol |
| DELETE | `/api/roles/:id` | `roles_admin` | Eliminar rol |
