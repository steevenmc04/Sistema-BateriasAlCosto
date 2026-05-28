import { Router } from 'express';
import ControladorClientes from '../controladores/ControladorClientes.js';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';

const router = Router();

router.get(
  '/buscar',
  verificarToken,
  ControladorClientes.buscar
);

router.get(
  '/:id',
  verificarToken,
  ControladorClientes.obtener
);

router.post(
  '/',
  verificarToken,
  exigirPermiso('ventas.crear'),
  ControladorClientes.crear
);

export default router;
