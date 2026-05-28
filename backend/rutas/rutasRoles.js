import express from 'express';
import ControladorRoles from '../controladores/ControladorRoles.js';
import { verificarToken, soloAdmin } from '../middleware/autenticacion.js';

const router = express.Router();

/**
 * Rutas protegidas para la gestión de roles.
 * Solo accesibles por el Administrador.
 */

router.get('/', verificarToken, soloAdmin, ControladorRoles.listar);
router.post('/', verificarToken, soloAdmin, ControladorRoles.guardar);
router.put('/:id', verificarToken, soloAdmin, ControladorRoles.actualizar);
router.delete('/:id', verificarToken, soloAdmin, ControladorRoles.eliminar);

export default router;
