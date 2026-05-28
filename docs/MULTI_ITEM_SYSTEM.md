# Multi-Item System — Sistema Baterías al Costo

## Arquitectura

El sistema multi-item permite registrar compras, ventas y chatarra con múltiples artículos en una sola transacción atómica.

### Principios
- **Una cabecera + muchos detalles** por operación
- **Una transacción SQL** por operación (beginTransaction/commit/rollback)
- **FOR UPDATE** para bloqueo de concurrencia
- **Validación de IVA** cruzada (backend calcula y verifica)
- **Sin duplicados** por producto dentro de una operación
- **Logger centralizado** para todas las operaciones
- **Auditoría** por cada operación (tabla `auditoria`)

## Flujos Soportados

### Multi-Compra
```
POST /api/compras
Body: { proveedor_id, numero_factura, subtotal, descuento, base_imponible, monto_iva, total, iva_porcentaje, articulos: [{ producto_id, cantidad, precio_unitario, descuento, condicion }] }
```
1. Validar proveedor, factura, montos, IVA
2. BEGIN TRANSACTION
3. INSERT cabecera (compras)
4. FOR EACH artículo: INSERT detalle_compras, UPDATE precio_costo, movimiento inventario (entrada)
5. COMMIT
6. Auditoría

### Multi-Venta
```
POST /api/ventas
Body: { cliente_id, sesion_caja_id, subtotal, descuento, base_imponible, monto_iva, total, iva_porcentaje, metodo_pago, articulos: [{ producto_id, cantidad, precio_unitario, descuento }] }
```
1. Validar cliente, caja, montos, IVA, stock
2. BEGIN TRANSACTION
3. FOR UPDATE en sesión caja
4. FOR EACH artículo: FOR UPDATE en stock, validar stock > 0
5. INSERT cabecera (ventas)
6. FOR EACH artículo: INSERT detalle_ventas, movimiento inventario (salida)
7. Registrar movimiento caja (ingreso)
8. COMMIT
9. Auditoría

### Multi-Chatarra
```
POST /api/chatarra
Body: { tipo_operacion, sesion_caja_id, subtotal, total, articulos: [{ producto_id, cantidad, precio_unitario, notas }] }
```
1. Validar tipo_operacion (entrada/salida), montos
2. BEGIN TRANSACTION
3. INSERT cabecera (chatarra_operaciones)
4. FOR EACH artículo: INSERT chatarra_detalles, movimiento inventario (chatarra)
5. Si tiene caja: registrar movimiento caja
6. COMMIT
7. Auditoría

## Validaciones Comunes

| Validación | Compra | Venta | Chatarra |
|-----------|--------|-------|----------|
| Array vacío | ✅ | ✅ | ✅ |
| NaN/Negativos | ✅ | ✅ | ✅ |
| Producto ID inválido | ✅ | ✅ | ✅ |
| Duplicados producto | ✅ | ✅ | ✅ |
| Stock insuficiente | N/A | ✅ | N/A |
| Caja inválida | N/A | ✅ | ✅ |
| IVA inconsistente | ✅ | ✅ | N/A |
| FOR UPDATE | ✅ | ✅ | ✅ |

## Modelos de Datos

### Tablas POS
- `compras` + `detalle_compras` — Compras multi-item
- `ventas` + `detalle_ventas` — Ventas multi-item
- `chatarra_operaciones` + `chatarra_detalles` — Chatarra multi-item
- `movimientos_inventario` — Kardex (incluye tipo 'chatarra')
- `inventario_stock` — Stock actual por producto
- `sesiones_caja` + `movimientos_caja` — Caja POS

### Tablas Legacy (coexistentes)
- `inventario_baterias` / `inventario_varios` — Inventario legacy
- `ventas_inventario` / `compras_inventario` — Operaciones legacy
- `chatarra_inventario` — Chatarra legacy
