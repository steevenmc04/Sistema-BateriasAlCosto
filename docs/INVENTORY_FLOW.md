# Inventory Flow — Sistema Baterías al Costo

## POS Inventory System

### Tablas
- `productos` — Catálogo de productos (baterías, varios, chatarra)
- `inventario_stock` — Stock actual (1:1 con productos, upsert)
- `movimientos_inventario` — Kardex histórico (entrada/salida/ajuste/chatarra)

### Flujo de Movimientos

#### Compra (entrada)
```
Compra → INSERT detalle_compras → MovimientoInventario.registrar(tipo: 'entrada')
  → FOR UPDATE en inventario_stock
  → stock_posterior = stock_anterior + cantidad
  → INSERT movimientos_inventario
  → UPSERT inventario_stock
```

#### Venta (salida)
```
Venta → Validar stock (FOR UPDATE) → INSERT detalle_ventas
  → MovimientoInventario.registrar(tipo: 'salida')
  → FOR UPDATE en inventario_stock
  → stock_posterior = stock_anterior - cantidad
  → INSERT movimientos_inventario
  → UPSERT inventario_stock
```

#### Chatarra
```
Chatarra → INSERT chatarra_detalles
  → MovimientoInventario.registrar(tipo: 'chatarra')
  → FOR UPDATE en inventario_stock
  → stock_posterior = stock_anterior ± cantidad
  → INSERT movimientos_inventario
  → UPSERT inventario_stock
```

#### Ajuste Manual
```
Ajuste → MovimientoInventario.registrar(tipo: 'ajuste')
  → FOR UPDATE en inventario_stock
  → stock_posterior = stock_anterior + cantidad (puede ser negativa)
  → INSERT movimientos_inventario
  → UPSERT inventario_stock
```

### Bloqueo de Concurrencia (FOR UPDATE)
Cada movimiento de inventario ejecuta:
```sql
SELECT cantidad FROM inventario_stock WHERE producto_id = ? FOR UPDATE
```
Esto bloquea la fila hasta que la transacción termina, previniendo race conditions.

### Integridad Referencial
- `movimientos_inventario.producto_id` → `productos.id`
- `inventario_stock.producto_id` → `productos.id` (ON DELETE CASCADE)
- Stock negativo: Validado en `MovimientoInventario.registrar()` con excepción clara

### Legacy Inventory (coexistente)
- `inventario_baterias` + `inventario_varios` — Tablas legacy
- NO sincronizadas con POS automáticamente
- Migración script `003_unificar_inventario_dual.sql` disponible
- No eliminar hasta migración completa verificada
