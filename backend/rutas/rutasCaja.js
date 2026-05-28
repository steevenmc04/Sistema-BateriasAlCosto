import { Router } from 'express';
import ControladorCaja from '../controladores/ControladorCaja.js';
import { verificarToken, soloAdmin } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';

/**
 * @rutas Gestión de Cajas y Turnos
 * @base /api/caja
 *
 * GET    /api/caja/registradoras                      → Listar todas las cajas registradoras
 * POST   /api/caja/registradoras                      → Crear una nueva caja registradora (Solo Admin)
 * PUT    /api/caja/registradoras/:id                  → Actualizar una caja registradora por ID (Solo Admin)
 * GET    /api/caja/estado                             → Obtener el estado y turno activo de caja para el usuario actual
 * POST   /api/caja/aperturas                          → Registrar la apertura de una caja (iniciar turno)
 * POST   /api/caja/cierres                            → Registrar el cierre y arqueo de una caja (finalizar turno)
 * GET    /api/caja/sesiones                           → Listar las sesiones o turnos históricos de caja
 * GET    /api/caja/sesiones/:id                       → Obtener los detalles de una sesión o turno de caja por ID
 * POST   /api/caja/movimientos                        → Registrar un movimiento manual de caja (ingreso o egreso)
 * GET    /api/caja/sesiones/:sesionCajaId/movimientos → Listar todos los movimientos de una sesión de caja específica
 *
 * @middleware verificarToken - Aplicado en todas las rutas para validar la autenticación del usuario.
 * @middleware exigirPermiso   - Control de acceso basado en roles (RBAC) para acciones específicas ('caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.movimientos').
 * @middleware soloAdmin       - Restringe el acceso únicamente a usuarios administradores para configurar cajas físicas/virtuales.
 */
const router = Router();

// Cajas registradoras (físicas / virtuales)
router.get('/registradoras', verificarToken, exigirPermiso('caja.ver'), ControladorCaja.listarCajas);
router.post('/registradoras', verificarToken, soloAdmin, ControladorCaja.crearCaja);
router.put('/registradoras/:id', verificarToken, soloAdmin, ControladorCaja.actualizarCaja);

// Turnos diarios / Sesiones y Cierres/Arqueos
router.get('/estado', verificarToken, exigirPermiso('caja.ver'), ControladorCaja.obtenerEstadoCaja);
router.post('/aperturas', verificarToken, exigirPermiso('caja.abrir'), ControladorCaja.abrirCaja);
router.post('/cierres', verificarToken, exigirPermiso('caja.cerrar'), ControladorCaja.cerrarCaja);
router.get('/sesiones', verificarToken, exigirPermiso('caja.ver'), ControladorCaja.listarSesiones);
router.get('/sesiones/:id', verificarToken, exigirPermiso('caja.ver'), ControladorCaja.obtenerSesion);

// Movimientos directos (ingreso/egreso manual)
router.post('/movimientos', verificarToken, exigirPermiso('caja.movimientos'), ControladorCaja.registrarMovimiento);
router.get('/sesiones/:sesionCajaId/movimientos', verificarToken, exigirPermiso('caja.ver'), ControladorCaja.listarMovimientos);

export default router;
