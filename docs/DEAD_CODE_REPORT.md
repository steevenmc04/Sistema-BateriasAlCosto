# Dead Code Elimination Report

## Removed Files
| File | Reason | Backup |
|------|--------|--------|
| `backend/constantes/permisos.js` | Nunca importado. `CLAVES_PERMISOS`, `PRESET_VENDEDOR`, `PRESET_ADMIN_TODOS`, `parsearPermisosDesdeFila`, `esRolAdministrador`, `puede` — todo muerto | `docs/backups/permisos.js.bak` |
| `backend/seed_excel_data.js` | Script de prueba manual, nunca importado en producción | `docs/backups/seed_excel_data.js.bak` |
| `backend/utilidades/sriClaveAcceso.js` | Solo usado por `sriFacturaXML.js` (ya eliminado) | `docs/backups/sriClaveAcceso.js.bak` |
| `backend/utilidades/sriFirma.js` | Dependencia `xml-crypto`, `node-forge`, `xmldom` — nunca importada | `docs/backups/sriFirma.js.bak` |

## Previously Removed
| File | When |
|------|------|
| `backend/controladores/ControladorVentas.js` (~200 líneas) | Sesión anterior |
| `backend/controladores/ControladorCompras.js` (~147 líneas) | Sesión anterior |
| `backend/utilidades/sriServicios.js` (~105 líneas) | Sesión anterior |
| `backend/utilidades/sriFacturaXML.js` (~119 líneas) | Sesión anterior |
| `backend/utilidades/alcanceHistorial.js` (~13 líneas) | Sesión anterior |
| 6x `.gitkeep` en directorios vacíos | Sesión anterior |

## Dead Code Retenido (por razones de negocio)
| Archivo | Razón |
|---------|-------|
| `backend/modelos/InventarioBateria.js` | Legacy activo — datos en `inventario_baterias` |
| `backend/modelos/InventarioVario.js` | Legacy activo — datos en `inventario_varios` |
| `backend/controladores/ControladorInventarioLegacy.js` | Rutas legacy activas en `/api/inventario` |
| `backend/rutas/rutasInventarioLegacy.js` | Rutas legacy activas |
| `backend/modelos/OperacionesInventario.js` | Lógica de negocio legacy en uso |
| `backend/controladores/ControladorOperacionesInventario.js` | Endpoints legacy en uso |
| `backend/rutas/rutasOperacionesInventario.js` | Endpoints legacy en uso |
