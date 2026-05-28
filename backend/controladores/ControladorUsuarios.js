import Logger from '../utilidades/logger.js';
import jwt from 'jsonwebtoken';
import Usuario from '../modelos/Usuario.js';
import Auditoria from '../modelos/Auditoria.js';
import { config } from '../configuracion/index.js';
import { idUsuarioParaJwt } from '../utilidades/jwtUsuario.js';

/**
 * Controlador de Negocio: ControladorUsuarios
 * Controla el ciclo de vida de usuarios, autenticacion JWT y control de acceso RBAC.
 */
class ControladorUsuarios {
  /**
   * Procesa el inicio de sesion y emite el token JWT.
   */
  static async login(req, res) {
    const { nombre_usuario, usuario, clave } = req.body || {};
    const loginUser = nombre_usuario || usuario;

    if (!loginUser || !clave) {
      return res.status(400).json({
        ok: false,
        error: 'Nombre de usuario y contrasena son requeridos.',
      });
    }

    try {
      const usuarioEncontrado = await Usuario.buscarPorNombreUsuario(loginUser);

      if (!usuarioEncontrado) {
        await Auditoria.registrar({
          accion: 'error',
          tabla_afectada: 'usuarios',
          descripcion: `Intento fallido de inicio de sesion. Usuario no existe: ${loginUser}`,
          ip_direccion: req.ip,
        });

        return res.status(400).json({
          ok: false,
          error: 'Credenciales incorrectas o usuario inactivo.',
        });
      }

      const claveValida = await Usuario.verificarClave(usuarioEncontrado, clave);
      if (!claveValida) {
        await Auditoria.registrar({
          usuario_id: usuarioEncontrado.id,
          accion: 'error',
          tabla_afectada: 'usuarios',
          descripcion: `Intento de inicio de sesion fallido por clave incorrecta para: ${loginUser}`,
          ip_direccion: req.ip,
        });

        return res.status(400).json({
          ok: false,
          error: 'Credenciales incorrectas o usuario inactivo.',
        });
      }

      const usuarioId = idUsuarioParaJwt(usuarioEncontrado.id);
      const rolId = idUsuarioParaJwt(usuarioEncontrado.rol_id);
      if (!usuarioId || !rolId) {
        return res.status(400).json({
          ok: false,
          error: 'Datos de usuario invalidos para iniciar sesion.',
        });
      }

      const permisos = Array.isArray(usuarioEncontrado.permisos)
        ? usuarioEncontrado.permisos
        : [];

      const token = jwt.sign(
        {
          id: usuarioId,
          nombre: usuarioEncontrado.nombre,
          nombre_usuario: usuarioEncontrado.nombre_usuario,
          rol_id: rolId,
          rol_nombre: usuarioEncontrado.rol_nombre,
          permisos,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      await Auditoria.registrar({
        usuario_id: usuarioId,
        accion: 'login',
        tabla_afectada: 'usuarios',
        registro_id: usuarioId,
        descripcion: `Usuario ${loginUser} inicio sesion con exito.`,
        ip_direccion: req.ip,
      });

      return res.status(200).json({
        ok: true,
        token,
        usuario: {
          id: usuarioId,
          nombre: usuarioEncontrado.nombre,
          nombre_usuario: usuarioEncontrado.nombre_usuario,
          rol_id: rolId,
          rol_nombre: usuarioEncontrado.rol_nombre,
          permisos,
        },
      });
    } catch (error) {
      Logger.error('ControladorUsuarios', 'Error en Login', error);
      return res.status(400).json({
        ok: false,
        error: 'Ocurrio un error en el servidor al procesar el inicio de sesion.',
      });
    }
  }

  /**
   * Obtiene la informacion del usuario actual autenticado.
   */
  static async obtenerPerfil(req, res) {
    try {
      const usuario = await Usuario.obtenerPorId(req.usuario.id);
      if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
      }
      return res.status(200).json({ usuario });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener perfil del usuario.' });
    }
  }

  /**
   * Lista todos los usuarios registrados (solo admins).
   */
  static async listar(req, res) {
    try {
      const usuarios = await Usuario.listarTodos();
      return res.status(200).json(usuarios);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener lista de usuarios.' });
    }
  }

  /**
   * Crea un nuevo usuario en el sistema.
   */
  static async crear(req, res) {
    const { nombre, nombre_usuario, clave, rol_id } = req.body;

    if (!nombre || !nombre_usuario || !clave || !rol_id) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
      const nuevoId = await Usuario.crear({ nombre, nombre_usuario, clave, rol_id });

      await Auditoria.registrar({
        usuario_id: req.usuario?.id,
        accion: 'crear',
        tabla_afectada: 'usuarios',
        registro_id: nuevoId,
        descripcion: `Creado nuevo usuario: ${nombre_usuario} (Rol ID: ${rol_id})`,
        ip_direccion: req.ip,
      });

      return res.status(201).json({ mensaje: 'Usuario creado exitosamente.', id: nuevoId });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: 'El nombre de usuario ya se encuentra registrado.' });
      }
      return res.status(500).json({ mensaje: 'Error al crear usuario.' });
    }
  }

  /**
   * Actualiza los datos generales de un usuario existente.
   */
  static async actualizar(req, res) {
    const { id } = req.params;
    const { nombre, nombre_usuario, rol_id, estado } = req.body;

    try {
      const anterior = await Usuario.obtenerPorId(id);
      if (!anterior) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
      }

      await Usuario.actualizar(id, { nombre, nombre_usuario, rol_id, estado });

      await Auditoria.registrar({
        usuario_id: req.usuario?.id,
        accion: 'editar',
        tabla_afectada: 'usuarios',
        registro_id: id,
        descripcion: `Usuario ${nombre_usuario} actualizado.`,
        datos_anteriores: anterior,
        datos_nuevos: { nombre, nombre_usuario, rol_id, estado },
        ip_direccion: req.ip,
      });

      return res.status(200).json({ mensaje: 'Usuario actualizado correctamente.' });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar usuario.' });
    }
  }

  /**
   * Cambia la contrasena de un usuario.
   */
  static async actualizarClave(req, res) {
    const { id } = req.params;
    const { clave } = req.body;

    if (!clave) {
      return res.status(400).json({ mensaje: 'La contrasena es requerida.' });
    }

    try {
      await Usuario.actualizarClave(id, clave);

      await Auditoria.registrar({
        usuario_id: req.usuario?.id,
        accion: 'editar',
        tabla_afectada: 'usuarios',
        registro_id: id,
        descripcion: 'Contrasena de usuario actualizada por el administrador.',
        ip_direccion: req.ip,
      });

      return res.status(200).json({ mensaje: 'Contrasena actualizada exitosamente.' });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar contrasena del usuario.' });
    }
  }

  /**
   * Lista los roles disponibles en el sistema.
   */
  static async listarRoles(req, res) {
    try {
      const roles = await Usuario.listarRoles();
      return res.status(200).json(roles);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener roles.' });
    }
  }
}

export default ControladorUsuarios;
