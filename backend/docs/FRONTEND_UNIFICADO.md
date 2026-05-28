# Frontend Unificado

## FormularioMultiItem.jsx

Archivo único que reemplaza los 3 formularios anteriores:

| Formulario antiguo | Reemplazado por |
|--------------------|-----------------|
| `FormularioVentaMultiItem.jsx` | `FormularioMultiItem.jsx` (modo venta) |
| `FormularioCompraMultiItem.jsx` | `FormularioMultiItem.jsx` (modo compra) |
| `FormularioChatarraMultiItem.jsx` | `FormularioMultiItem.jsx` (modo chatarra) |

### Cómo funciona

1. **Selector de tipo** en la parte superior: Venta / Compra / Chatarra
2. **Campos dinámicos** que cambian según el tipo seleccionado:
   - Venta: Cliente, Método de Pago, Factura opcional
   - Compra: Proveedor, Factura obligatoria
   - Chatarra: Campos mínimos (sin cliente/proveedor/factura)
3. **Items dinámicos**: usa `useMultiItem` hook (idéntico a los formularios originales)
4. **Totales**: cálculos automáticos con IVA 15%
5. **Submits** a endpoints POS (`/api/ventas`, `/api/compras`, `/api/chatarra`)

### Uso en el router

```jsx
<Route path="/operacion/nueva" element={<FormularioMultiItem />} />
```

### Comparativa con formularios legacy

| Aspecto | Legacy (VistaTransacciones) | POS Unificado |
|---------|----------------------------|---------------|
| Tablas | `inventario_baterias`, `inventario_varios` | `productos` |
| Operaciones | Endpoints separados por tipo | Endpoints POS unificados |
| Items | Un item por transacción | Multi-item nativo |
| UI | Tailwind + diseño moderno | Tailwind + diseño moderno |
| Estado | En producción | En producción |

## Servicios

No se requieren cambios en `servicios.js`. El formulario usa `fetch` directo a los endpoints POS que ya existen.
