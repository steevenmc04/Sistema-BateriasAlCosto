import { Router } from 'express';
import ControladorVentasMultiItem from '../controladores/ControladorVentasMultiItem.js';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';

const router = Router();

// Ventas (MULTI-ITEM TRANSACCIONAL)
router.post('/', verificarToken, exigirPermiso('ventas.crear'), ControladorVentasMultiItem.crear);
router.get('/', verificarToken, exigirPermiso('ventas.ver'), ControladorVentasMultiItem.listar);
router.get('/:id', verificarToken, exigirPermiso('ventas.ver'), ControladorVentasMultiItem.obtener);
router.delete('/:id', verificarToken, exigirPermiso('ventas.anular'), ControladorVentasMultiItem.anular);

export default router;
