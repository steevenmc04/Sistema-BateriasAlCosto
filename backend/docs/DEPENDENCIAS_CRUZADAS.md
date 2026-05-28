# Dependencias Cruzadas — Mapa Completo

## Situación actual

El sistema opera con 2 subsistemas de inventario en paralelo que NO deben mezclarse:

```
                    Frontend
                   /         \
        VistaTransacciones   FormularioVentaMultiItem
        (usa legacy)         (usa POS)
              |                    |
         Operaciones            /api/ventas
         Inventario            /api/compras
         (legacy)              /api/chatarra
              |                    |
         ┌─────┴──────┐      ┌────┴────┐
         │ventas_inv  │      │ventas   │
         │compras_inv │      │compras  │
         │chatarra_inv│      │chatarra │
         │inv_bat     │      │productos│
         │inv_varios  │      │inv_stock│
         └────────────┘      └─────────┘
```

## Tablas y sus consumidores

| Tabla | Backend | Frontend | Nota |
|-------|---------|----------|------|
| `productos` | Controladores POS | Formularios MultiItem | Sistema destino |
| `inventario_stock` | Controladores POS | Formularios MultiItem | Sistema destino |
| `ventas` | Controladores POS | Formularios MultiItem | Sistema destino |
| `compras` | Controladores POS | Formularios MultiItem | Sistema destino |
| `chatarra_operaciones` | Controladores POS | Formularios MultiItem | Sistema destino |
| `inventario_baterias` | `ControladorInventarioLegacy` | `VistaTransacciones` | Legacy |
| `inventario_varios` | `ControladorInventarioLegacy` | `VistaTransacciones` | Legacy |
| `ventas_inventario` | `ControladorInformes`, `Reporte` | `VistaTransacciones` | Legacy |
| `compras_inventario` | `ControladorInformes` | `VistaTransacciones` | Legacy |
| `chatarra_inventario` | `ControladorInformes`, `Reporte` | `VistaTransacciones` | Legacy |

## Archivos críticos (NO MODIFICAR sin análisis de impacto)

| Archivo | Dependencias |
|---------|-------------|
| `useVistaTransacciones.js` (1277 líneas) | `operacionesService`, `inventarioAPI` — ambos legacy |
| `ControladorInventarioLegacy.js` | `InventarioBateria`, `InventarioVario` — legacy |
| `ControladorOperacionesInventario.js` | `OperacionesInventario` — legacy |
| `OperacionesInventario.js` (560 líneas) | 5 tablas legacy |
| `Reporte.js` | `ventas_inventario`, `chatarra_inventario` |

## Plan de migración seguro

### Fase 1 (COMPLETADA) — Esquema
- ✅ Migración 003: migrar datos legacy a POS
- ✅ Migración 007: agregar `tipo` a `productos`
- ✅ Formularios MultiItem POS (venta, compra, chatarra)

### Fase 2 (EN CURSO) — Frontend unificado
- ✅ `FormularioMultiItem.jsx` unificado
- 🔲 Migrar `VistaTransacciones.jsx` a POS

### Fase 3 (FUTURO) — Limpieza legacy
- 🔲 Reemplazar `ControladorInventarioLegacy` por CRUD `productos`
- 🔲 Reemplazar `ControladorOperacionesInventario` por endpoint POS único
- 🔲 Eliminar tablas legacy (solo después de verificación)
