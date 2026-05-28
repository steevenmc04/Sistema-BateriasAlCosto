# Migración Legacy → POS

## Estado actual

El sistema tiene 2 subsistemas de inventario en paralelo:

- **Legacy** (`inventario_baterias`, `inventario_varios`, `OperacionesInventario`)
  → Usado por `VistaTransacciones.jsx` y sus controladores.
- **POS** (`productos`, `inventario_stock`, `ventas`, `compras`, `chatarra_operaciones`)
  → Usado por `FormularioVentaMultiItem`, `FormularioCompraMultiItem`, `FormularioChatarraMultiItem`.

## Migraciones ejecutadas

| Migración | Archivo | Descripción |
|-----------|---------|-------------|
| 003 | `003_unificar_inventario_dual.sql` | Migrar `inventario_baterias` y `inventario_varios` → `productos` |
| 007 | `007_unificar_tipo_producto.sql` | Agregar `tipo` a `productos`, backfill, migración complementaria |

## Pasos para finalizar migración

### 1. Ejecutar migración 007
```bash
mysql -u root -p sistema_baterias < database/migrations/007_unificar_tipo_producto.sql
```

### 2. Verificar datos migrados
```sql
SELECT p.tipo, COUNT(*), SUM(COALESCE(inv_st.cantidad,0)) AS stock
FROM productos p
LEFT JOIN inventario_stock inv_st ON p.id = inv_st.producto_id
GROUP BY p.tipo;
```

### 3. Validar que no hay diferencias legacy vs POS
```sql
SELECT 'FALTAN EN POS' AS estado, ib.codigo
FROM inventario_baterias ib
LEFT JOIN productos p ON ib.codigo = p.codigo
WHERE p.id IS NULL
UNION
SELECT 'SOBRAN EN POS', p.codigo
FROM productos p
LEFT JOIN inventario_baterias ib ON p.codigo = ib.codigo
WHERE ib.id IS NULL AND p.tipo = 'bateria';
```

### 4. Desactivar endpoints legacy (opcional)
En `backend/app.js`:
```js
// Comentar líneas:
// app.use('/api/inventario', rutasInventarioLegacy);
// app.use('/api/operaciones', rutasOperacionesInventario);
```

## Rollback

Las migraciones son **no destructivas**. Las tablas legacy se mantienen.
Para revertir, restaurar backup de BD y revertir cambios en `app.js`.
