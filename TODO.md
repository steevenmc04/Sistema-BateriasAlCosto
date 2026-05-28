# TODO — Stock disponible + precio al seleccionar batería (VENTAS)

## Paso 1
- [x] Entender flujo actual:
  - Modal VENTA usa `TablaItemsVenta` con `items={h.ventaItems.items}`
  - `useOperacionMultiItem` no valida stock
  - `TablaItemsVenta` autocompleta marca/tipo/precio pero NO stock

## Paso 2 (implementación)
- [ ] `frontend/src/hooks/useOperacionMultiItem.js`
  - Agregar soporte de campos en cada item:
    - `stock_disponible`
    - `precio_actual` (o equivalente interno para UX)
  - No romper cálculo de totales existentes

- [ ] `frontend/src/componentes/TablaItemsVenta.jsx`
  - Solo para VENTA (cuando `modoCompra` no esté activo):
    - Al cambiar `marca` o `tipo_caja`, buscar match en `productos`
    - Autocompletar:
      - `precio_unitario` desde inventario
      - `stock_disponible` desde inventario
    - Mostrar debajo:
      - `Disponible: X unidades` / `Stock bajo: X disponibles`
    - Colorear según umbral:
      - verde >= 5
      - amarillo 5–9
      - rojo < 5
  - Para COMPRA (`modoCompra=true`): NO mostrar stock ni validaciones de stock

- [ ] `frontend/src/hooks/useVistaTransacciones.js`
  - En `validar('venta', items)`:
    - Bloquear submit si `cantidad > stock_disponible`
    - Mensaje elegante:
      - `Stock insuficiente`
      - `Solo hay X unidades disponibles`

## Paso 3 (QA)
- [x] Ejecutar build front-end y revisar consola sin errores
- [ ] QA VENTA:
  - Seleccionar batería => aparece stock
  - Precio autocompletado editable
  - Cantidad > stock => error y bloquear submit
- [ ] QA COMPRA:
  - No mostrar stock
  - No romper la compra
- [ ] QA CHATARRA:
  - No mostrar stock
  - No romper chatarra
