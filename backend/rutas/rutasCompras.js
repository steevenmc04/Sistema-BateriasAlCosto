import { Router } from 'express';
import ControladorComprasMultiItem from '../controladores/ControladorComprasMultiItem.js';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';

/**
 * @rutas Gestión de Compras
 * @base /api/compras
 *
 * @middleware verificarToken - Requiere autenticación de usuario activa en el sistema para todas las peticiones.
 * @middleware exigirPermiso   - Control de acceso basado en privilegios RBAC específicos ('compras.crear', 'compras.ver').
 */
const router = Router();

// Compras (MULTI-ITEM TRANSACCIONAL)
router.post(
  '/',
  verificarToken,
  exigirPermiso('compras.crear'),
  ControladorComprasMultiItem.crear
);

router.get(
  '/',
  verificarToken,
  exigirPermiso('compras.ver'),
  ControladorComprasMultiItem.listar
);

router.get(
  '/:id',
  verificarToken,
  exigirPermiso('compras.ver'),
  ControladorComprasMultiItem.obtener
);

router.delete(
  '/:id',
  verificarToken,
  exigirPermiso('compras.crear'),
  ControladorComprasMultiItem.anular
);

export default router;
