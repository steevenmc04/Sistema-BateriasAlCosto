# Testing Report — Sistema Baterías al Costo

## Estado Actual
**No hay framework de testing configurado.** No se encontraron tests unitarios, de integración ni end-to-end.

## Plan Propuesto

### Fase 1: Setup (30min)
```bash
cd backend && npm install --save-dev jest supertest
cd frontend && npm install --save-dev vitest @testing-library/react
```

### Fase 2: Tests Unitarios Backend (~4h)
| Test | Archivo | Prioridad |
|------|---------|-----------|
| Validación IVA (cálculos) | `test/validacionIva.test.js` | ALTA |
| Permisos RBAC | `test/permisos.test.js` | ALTA |
| Logger | `test/logger.test.js` | MEDIA |
| Multi-item validación | `test/multiItem.test.js` | MEDIA |
| JWT | `test/jwt.test.js` | MEDIA |

### Fase 3: Tests Integración API (~4h)
| Endpoint | Prioridad |
|----------|-----------|
| POST /api/login | ALTA |
| GET /api/inventario | ALTA |
| POST /api/ventas | ALTA |
| POST /api/compras | ALTA |
| POST /api/facturas | ALTA |
| CRUD /api/usuarios | MEDIA |
| CRUD /api/roles | MEDIA |
| Flujo caja (abrir/cerrar) | MEDIA |

### Fase 4: Tests Frontend (~3h)
- Renderizado de componentes principales (VistaTransacciones, FormularioVenta)
- Validación de formularios (campos requeridos, montos)
- Flujo de login/logout

## Cobertura Esperada
- Funcionalidades críticas: 80%+
- Total proyecto: 40%+ en primera iteración
- Tiempo total: ~12h
