# Reporte de Seguridad — Sistema Baterías al Costo

## Resumen
| Categoría | Hallazgos | Críticos | Resueltos |
|-----------|-----------|----------|-----------|
| Autenticación | 4 | 1 | 2 |
| Red/Transporte | 2 | 0 | 1 |
| Logging/Debug | 2 | 0 | 2 |
| Criptografía | 1 | 0 | 1 |

## Hallazgos

### H1: JWT en localStorage (CRÍTICO)
- **Archivos**: `frontend/src/hooks/useSesion.js`, `useVistaLogin.js`, `servicios.js`, `FormularioVentaMultiItem.jsx`, `FormularioCompraMultiItem.jsx`
- **Riesgo**: XSS → robo de token → suplantación total
- **Fix**: Migrar a HttpOnly cookies + refresh token. Requiere cambios en backend (login, autenticación.js) y frontend (axios withCredentials, eliminar localStorage).
- **Estado**: ⏳ Pendiente (requiere planificación cuidadosa)

### H2: Sin rate limiting en login (RESUELTO)
- **Fix**: `express-rate-limit` agregado en `/api/login` (10 intentos/15min)

### H3: JWT_EXPIRES_IN muy largo (RESUELTO)
- **Antes**: `'10h'` por defecto
- **Después**: `'8h'` por defecto (`.env` existente ya tenía `8h`)

### H4: Math.random() para IDs únicos (RESUELTO)
- **Archivos**: `frontend/src/hooks/useMultiItem.js`
- **Fix**: Reemplazado por contador monotónico `uid()`

### H5: Console.log con datos sensibles (RESUELTO)
- **Fix**: Todos los `console.log/error/warn` migrados a `Logger` centralizado

### H6: rejectUnauthorized: false (RESUELTO)
- **Archivo**: `backend/configuracion/baseDeDatos.js`
- **Fix**: Solo aplica SSL estricto en producción

### H7: Logging de contraseñas (NO APLICA)
- No se encontraron contraseñas en logs. Auditoría registra intentos de login sin exponer credenciales.

## Recomendaciones Priorizadas
1. Migrar JWT a HttpOnly cookies + refresh token (critico, ~4h)
2. Agregar helmet como middleware Express (~15min)
3. Validar entrada de datos con esquemas (Joi/Zod) en endpoints críticos (~2h)
4. Agregar sanitización HTML en respuestas de error
