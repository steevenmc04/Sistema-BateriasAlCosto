# API Unificada — Referencia de Endpoints

## Productos (reemplaza inventario legacy)

| Método | Ruta | Descripción | Reemplaza |
|--------|------|-------------|-----------|
| GET | `/api/productos?tipo=bateria&activo=1` | Lista productos (con filtros) | `GET /api/inventario/baterias` |
| GET | `/api/productos/:id` | Producto por ID | — |
| POST | `/api/productos` | Crear producto | `POST /api/inventario/baterias` |
| PUT | `/api/productos/:id` | Actualizar producto | `PUT /api/inventario/baterias/:id` |
| DELETE | `/api/productos/:id` | Eliminar (desactivar) | `DELETE /api/inventario/baterias/:id` |
| GET | `/api/productos/buscar?q=texto` | Buscar productos | Ambos endpoints legacy |

### Formato producto (payload/response)
```json
{
  "id": 1,
  "categoria_id": 2,
  "tipo": "bateria",
  "codigo": "BAT-001",
  "nombre": "Batería Bosch 12V",
  "marca": "Bosch",
  "modelo": "S4",
  "condicion": "Nueva",
  "tipo_caja": "L2",
  "precio_costo": 45.00,
  "precio_venta": 89.00,
  "stock_minimo": 3,
  "activo": true,
  "stock": {
    "cantidad": 15,
    "actualizado_en": "2025-01-01T00:00:00Z"
  }
}
```

## Operaciones POS

### Venta
```
POST /api/ventas
Body: {
  "cliente_id": 1,
  "sesion_caja_id": 2,
  "numero_factura": "001-001-000000001",
  "subtotal": 100.00,
  "descuento": 5.00,
  "base_imponible": 95.00,
  "monto_iva": 14.25,
  "total": 109.25,
  "iva_porcentaje": 15,
  "metodo_pago": "efectivo",
  "notas": null,
  "articulos": [
    { "producto_id": 1, "cantidad": 2, "precio_unitario": 50.00, "descuento": 0 }
  ]
}
```

### Compra
```
POST /api/compras
Body: {
  "proveedor_id": 1,
  "numero_factura": "001-001-000000050",
  "subtotal": 200.00,
  "descuento": 0,
  "base_imponible": 200.00,
  "monto_iva": 30.00,
  "total": 230.00,
  "iva_porcentaje": 15,
  "notas": null,
  "articulos": [
    { "producto_id": 1, "cantidad": 5, "precio_unitario": 40.00, "descuento": 0 }
  ]
}
```

### Chatarra
```
POST /api/chatarra
Body: {
  "tipo_operacion": "salida",
  "sesion_caja_id": null,
  "subtotal": 50.00,
  "total": 50.00,
  "notas": null,
  "articulos": [
    { "producto_id": 3, "cantidad": 10, "precio_unitario": 5.00, "descuento": 0 }
  ]
}
```

## Historial

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ventas/historial?fecha_desde=...&fecha_hasta=...` | Historial ventas POS |
| GET | `/api/compras/historial?fecha_desde=...&fecha_hasta=...` | Historial compras POS |
| GET | `/api/chatarra/historial?fecha_desde=...&fecha_hasta=...` | Historial chatarra POS |
| GET | `/api/informes/...` | Reportes (usando POS data) |

## Endpoints Legacy (compatibilidad)

| Ruta | Estado | Nota |
|------|--------|------|
| `/api/inventario/baterias/*` | Mantenido | Usado por VistaTransacciones |
| `/api/inventario/varios/*` | Mantenido | Usado por VistaTransacciones |
| `/api/operaciones/*` | Mantenido | Usado por VistaTransacciones |
