# Frontend Refactor Plan

## Objetivo
Dividir archivos grandes (>500 líneas) en módulos más manejables sin cambiar funcionalidad.

## Archivos Candidatos

### 1. `VistaTransacciones.jsx` (1277 líneas) — PRIORIDAD ALTA
- **Componentes internos**: Tabla de transacciones, filtros, modal de detalle
- **Propuesta**: Extraer `TablaTransacciones`, `FiltrosTransacciones`, `ModalDetalleTransaccion` a `componentes/transacciones/`
- **Riesgo**: Alto — requiere refactor de estado compartido

### 2. `VistaFacturas.jsx` (683 líneas) — PRIORIDAD MEDIA
- **Componentes internos**: Tabla facturas, filtros, modal SRI
- **Propuesta**: Extraer `TablaFacturas`, `ModalFacturaSRI`, `FormularioConfigEmpresa`

### 3. `App.jsx` (~400 líneas) — PRIORIDAD MEDIA
- **Componentes internos**: Sidebar, layout, routing
- **Propuesta**: Extraer `Sidebar`, `AppLayout`, ruteo a `router.jsx`

### 4. `FormularioVentaMultiItem.jsx` (~600 líneas) — PRIORIDAD BAJA
- **Propuesta**: Extraer lógica de cálculo de IVA/totales a helpers

### 5. `FormularioCompraMultiItem.jsx` (~550 líneas) — PRIORIDAD BAJA
- **Propuesta**: Similar al de ventas

## Estrategia
1. Dividir por responsabilidad (tablas, formularios, modales)
2. Mantener hooks puros (`useVista*.js`) intactos
3. Crear directorios por feature: `componentes/transacciones/`, `componentes/facturas/`
4. Usar export/import nombrados para evitar default conflicts
5. Probar cada extracción individualmente

## Tiempo Estimado
- `VistaTransacciones.jsx`: ~3h
- `VistaFacturas.jsx`: ~2h  
- `App.jsx`: ~1.5h
- Formularios: ~2h
- **Total**: ~8.5h
