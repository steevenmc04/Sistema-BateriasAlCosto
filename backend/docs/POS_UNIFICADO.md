# POS Unificado — Arquitectura

## Visión General

El sistema unifica todos los tipos de operación (venta, compra, chatarra) bajo un mismo flujo POS.
Ya no existen flujos separados para baterías vs varios vs chatarra.

## Tablas POS (sistema único)

| Tabla | Propósito |
|-------|-----------|
| `productos` | Catálogo único. Columna `tipo ENUM('bateria','varios','chatarra')` |
| `inventario_stock` | Stock (1:1 con productos) |
| `movimientos_inventario` | Kardex unificado |
| `ventas` + `detalle_ventas` | Ventas POS |
| `compras` + `detalle_compras` | Compras POS |
| `chatarra_operaciones` + `chatarra_detalles` | Chatarra POS |

## Tablas Legacy (solo lectura)

| Tabla | Estado |
|-------|--------|
| `inventario_baterias` | Legacy — migrada a `productos` |
| `inventario_varios` | Legacy — migrada a `productos` |
| `ventas_inventario` | Legacy — datos históricos |
| `compras_inventario` | Legacy — datos históricos |
| `chatarra_inventario` | Legacy — datos históricos |

## Flujo de datos

```
Frontend (FormularioMultiItem.jsx)
  └─ tipoOperacion = 'venta' | 'compra' | 'chatarra'
       └─ POST /api/ventas | /api/compras | /api/chatarra
            └─ ControladorPOS
                 ├─ INSERT INTO ventas/compras/chatarra_operaciones
                 ├─ INSERT INTO detalle_ventas/detalle_compras/chatarra_detalles
                 ├─ UPDATE inventario_stock
                 └─ INSERT INTO movimientos_inventario (kardex)
```

## Endpoints POS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Lista productos (filtro opcional `?tipo=bateria`) |
| POST | `/api/ventas` | Registrar venta POS |
| POST | `/api/compras` | Registrar compra POS |
| POST | `/api/chatarra` | Registrar chatarra POS |
| GET | `/api/ventas/historial` | Historial ventas POS |
| GET | `/api/compras/historial` | Historial compras POS |
| GET | `/api/chatarra/historial` | Historial chatarra POS |
