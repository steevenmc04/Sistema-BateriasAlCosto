# Logger Migration Report

## Summary
Migrated all `console.log`, `console.error`, `console.warn` in backend to centralized `Logger` class.

## Migration Stats
| Severity | Count | Status |
|----------|-------|--------|
| `Logger.debug` | 13 | ✅ |
| `Logger.info` | 6 | ✅ |
| `Logger.warn` | (en Logger interno) | ✅ |
| `Logger.error` | 22 | ✅ |
| `Logger.audit` | 0 | ℹ️ Sin uso aún |

## Files Modified

| File | Changes |
|------|---------|
| `backend/modelos/Venta.js` | 8x `console.log` → `Logger.debug`, 2x `console.error` → `Logger.error` |
| `backend/modelos/MovimientoInventario.js` | 5x `console.log` → `Logger.debug`, 1x `console.error` → `Logger.error` |
| `backend/modelos/Auditoria.js` | 1x `console.error` → `Logger.error` |
| `backend/servidor.js` | 5x `console.log` → `Logger.info`, 5x `console.error` → `Logger.error` (estructurado) |
| `backend/app.js` | 1x `console.error` → `Logger.error` |
| `backend/controladores/ControladorUsuarios.js` | 1x `console.error` → `Logger.error` |
| `backend/controladores/ControladorInventario.js` | 5x `console.error` → `Logger.error` |
| `backend/controladores/ControladorCaja.js` | 5x `console.error` → `Logger.error` |
| `backend/controladores/ControladorFacturaLegacy.js` | 8x `console.error` → `Logger.error` |
| `backend/controladores/ControladorFacturaSRI.js` | 2x `console.error` → `Logger.error` |

## Design Decisions
- `Logger.debug` usado para logs transaccionales (Venta, MovimientoInventario) — solo visibles con `DEBUG=true`
- `Logger.info` usado para información de arranque del servidor
- `Logger.error` usado para errores capturados en catch blocks
- Logger centralizado evita exponer datos sensibles en producción

## Logger Class (`backend/utilidades/logger.js`)
- `debug(module, message, data)` — solo con DEBUG=true o NODE_ENV=development
- `info(module, message, data)` — siempre visible
- `warn(module, message, data)` — siempre visible
- `error(module, message, error)` — siempre visible, extrae stack en desarrollo
- `audit(module, message, data)` — para eventos críticos de negocio
