# Removed Files — Sistema Baterías al Costo

## Session Actual (May 24, 2026)

| File | Lines | Reason | Backup |
|------|-------|--------|--------|
| `backend/constantes/permisos.js` | 83 | Dead code — `CLAVES_PERMISOS`, `PRESET_*`, `parsearPermisosDesdeFila`, `esRolAdministrador`, `puede` nunca importados | `docs/backups/permisos.js.bak` |
| `backend/seed_excel_data.js` | 42 | Script de prueba manual, nunca importado | `docs/backups/seed_excel_data.js.bak` |
| `backend/utilidades/sriClaveAcceso.js` | 43 | Solo usado por `sriFacturaXML.js` (ya eliminado) | `docs/backups/sriClaveAcceso.js.bak` |
| `backend/utilidades/sriFirma.js` | 79 | Dependencias `xml-crypto`, `node-forge`, `xmldom` — nunca importado | `docs/backups/sriFirma.js.bak` |

## Session Anterior (May 22, 2026)

| File | Lines | Reason |
|------|-------|--------|
| `backend/controladores/ControladorVentas.js` | ~200 | Replaced by ControladorVentasMultiItem |
| `backend/controladores/ControladorCompras.js` | ~147 | Replaced by ControladorComprasMultiItem |
| `backend/utilidades/sriServicios.js` | ~105 | Dead — SRI directo no implementado |
| `backend/utilidades/sriFacturaXML.js` | ~119 | Dead — SRI XML generation never used |
| `backend/utilidades/alcanceHistorial.js` | ~13 | Dead — never imported |
| 6x `.gitkeep` files | 1 each | Empty directories placeholder |

## Total Cleanup
- **18 archivos eliminados** (~850+ líneas)
- **Backups disponibles** en `docs/backups/`
