import { Router } from 'express';
import ControladorUsuarios from '../controladores/ControladorUsuarios.js';
import { verificarToken, soloAdmin } from '../middleware/autenticacion.js';

const router = Router();

// Rutas Públicas / Inicio de sesión
router.post('/login', ControladorUsuarios.login);

// Rutas Protegidas de Perfil de Usuario
router.get('/perfil', verificarToken, ControladorUsuarios.obtenerPerfil);

// Rutas Administrativas de CRUD de Usuarios y Roles
router.get('/', verificarToken, soloAdmin, ControladorUsuarios.listar);
router.post('/', verificarToken, soloAdmin, ControladorUsuarios.crear);
router.put('/:id', verificarToken, soloAdmin, ControladorUsuarios.actualizar);
router.put('/:id/clave', verificarToken, soloAdmin, ControladorUsuarios.actualizarClave);
router.get('/roles', verificarToken, ControladorUsuarios.listarRoles);

export default router;
