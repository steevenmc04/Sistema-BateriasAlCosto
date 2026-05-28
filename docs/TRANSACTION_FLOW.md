# Transaction Flow — Sistema Baterías al Costo

## Patrón Transaccional

Todas las operaciones multi-item usan el mismo patrón transaccional:

```javascript
const conexion = await pool.getConnection();

try {
  await conexion.beginTransaction();

  // 1. FOR UPDATE en recursos compartidos
  // 2. INSERT cabecera
  // 3. FOR EACH artículo: INSERT detalle
  // 4. Movimientos secundarios (inventario, caja)

  await conexion.commit();
  return resultado;
} catch (error) {
  await conexion.rollback();
  throw error;
} finally {
  conexion.release();
}
```

## Recursos Bloqueados (FOR UPDATE)

| Operación | Recurso Bloqueado |
|-----------|------------------|
| Compra | Ninguno (no hay recurso compartido en compras) |
| Venta | `sesiones_caja(id)` — verificar caja abierta |
| Venta | `inventario_stock(producto_id)` — verificar stock disponible |
| Venta | `productos(id)` — verificar producto existe |
| Anulación Venta | `ventas(id)` — verificar no anulada |
| Anulación Compra | `compras(id)` — verificar no anulada |
| Cierre Caja | `sesiones_caja(id)` — bloqueo para arqueo |
| Facturación | `empresa_config` — bloqueo para secuencial |

## Manejo de Errores

### Backend HTTP Status Codes
| Código | Significado | Ejemplo |
|--------|-------------|---------|
| 200 | OK | Operación exitosa |
| 201 | Creado | Recurso creado |
| 400 | Bad Request | Validación fallida, stock insuficiente |
| 401 | Unauthorized | Token inválido |
| 403 | Forbidden | Sin permiso RBAC |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Duplicado, ya anulado |
| 500 | Internal Error | Error no controlado |

### Error Response Format
```json
{
  "ok": false,
  "error": "Mensaje descriptivo del error"
}
```

### Success Response Format
```json
{
  "ok": true,
  "data": { ... },
  "message": "Mensaje opcional"
}
```

## Validaciones por Capa

### Capa 1: Controlador (HTTP)
- Parseo de body
- Tipos de datos
- Rangos básicos
- Arrays no vacíos

### Capa 2: Modelo (SQL)
- FOR UPDATE
- Integridad referencial
- Duplicados
- Stock
- IVA

### Capa 3: Base de Datos
- FKs
- UNIQUE constraints
- ENUM values
- ON DELETE CASCADE

## IVA (Cálculo y Validación)

```javascript
// Backend recalcula y verifica
const base_calculada = Math.round((subtotal - descuento) * 100) / 100;
const iva_calculado = Math.round(base_calculada * (iva_porcentaje / 100) * 100) / 100;
const total_calculado = Math.round((base_calculada + iva_calculado) * 100) / 100;

// Si difiere > 0.01 del enviado por frontend → error
if (Math.abs(total - total_calculado) > 0.01) {
  throw new Error('Total inconsistente');
}
```

## Facturación desde Venta POS
Las ventas multi-item pueden generar factura usando `FacturaLegacy.crearDesdeVenta(ventaId, usuarioId)`:
1. Obtener venta + detalle_ventas
2. Crear factura con `venta_pos_id = ventaId`
3. Generar número correlativo atómico
4. Calcular IVA desde datos de venta
5. Insertar factura_detalles desde detalle_ventas
6. Retornar factura ID
