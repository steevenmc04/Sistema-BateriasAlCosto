# Chatarra Multi-Item Flow

## Concepto
El módulo de chatarra permite registrar operaciones de compra y venta de materiales reciclables (baterías dañadas, plomo, cables usados) usando productos del catálogo POS.

## Tipos de Operación

### Entrada (Compra de Chatarra)
- La empresa compra chatarra a proveedores/recicladores
- Aumenta el stock del producto en `inventario_stock`
- Registra movimiento de caja como EGRESO
- Registra en `movimientos_inventario` como tipo 'chatarra'

### Salida (Venta de Chatarra)
- La empresa vende chatarra acumulada
- Disminuye el stock del producto en `inventario_stock`
- Registra movimiento de caja como INGRESO
- Registra en `movimientos_inventario` como tipo 'chatarra'

## Tablas

### chatarra_operaciones (cabecera)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT AUTO_INCREMENT | PK |
| tipo_operacion | ENUM('entrada','salida') | Compra o venta |
| usuario_id | BIGINT UNSIGNED | FK → usuarios |
| sesion_caja_id | BIGINT UNSIGNED | FK → sesiones_caja (opcional) |
| subtotal | DECIMAL(12,2) | Suma de subtotales |
| total | DECIMAL(12,2) | Total de la operación |
| notas | TEXT | Notas generales |
| estado | ENUM('registrada','anulada') | Estado actual |

### chatarra_detalles (detalle)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT AUTO_INCREMENT | PK |
| chatarra_id | BIGINT UNSIGNED | FK → chatarra_operaciones |
| producto_id | BIGINT UNSIGNED | FK → productos |
| cantidad | INT | Cantidad (peso/uds) |
| precio_unitario | DECIMAL(12,2) | Precio por unidad |
| subtotal | DECIMAL(12,2) | cantidad × precio_unitario |
| notas | TEXT | Notas del item |

## Endpoints

### POST /api/chatarra
Crear operación de chatarra multi-item.

**Body:**
```json
{
  "tipo_operacion": "entrada|salida",
  "sesion_caja_id": 1,
  "subtotal": 150.00,
  "total": 150.00,
  "notas": "Compra de baterías usadas",
  "articulos": [
    { "producto_id": 1, "cantidad": 4, "precio_unitario": 25.00, "notas": "Baterías dañadas" },
    { "producto_id": 2, "cantidad": 10, "precio_unitario": 5.00, "notas": "Plomo reciclaje" }
  ]
}
```

### Anulación
La anulación revierte:
1. Movimientos de inventario (ajuste opuesto)
2. Movimiento de caja (reversa)
3. Cambia estado a 'anulada'

## Relación con Otros Módulos

### Inventario
- Chatarra usa `productos` del catálogo POS
- No usa `chatarra_inventario` legacy
- Stock se actualiza vía `MovimientoInventario` con tipo 'chatarra'

### Caja
- Si se proporciona `sesion_caja_id`, registra movimiento
- Entrada → Egreso (la empresa paga por la chatarra)
- Salida → Ingreso (la empresa recibe pago por la chatarra)

### Auditoría
- Cada operación registra en `auditoria`
- Cada anulación registra en `auditoria`
