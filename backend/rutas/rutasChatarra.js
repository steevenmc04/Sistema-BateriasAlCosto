import { Router } from 'express';
import ControladorChatarraMultiItem from '../controladores/ControladorChatarraMultiItem.js';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';

const router = Router();

router.post('/', verificarToken, exigirPermiso('inventario.crear'), ControladorChatarraMultiItem.crear);
router.get('/', verificarToken, exigirPermiso('inventario.ver'), ControladorChatarraMultiItem.listar);
router.get('/:id', verificarToken, exigirPermiso('inventario.ver'), ControladorChatarraMultiItem.obtener);
router.delete('/:id', verificarToken, exigirPermiso('inventario.eliminar'), ControladorChatarraMultiItem.anular);

export default router;
