import Rol from '../modelos/Rol.js';

class ControladorRoles {
  /**
   * Lista todos los roles configurados en el sistema.
   */
  static async listar(req, res) {
    try {
      const filas = await Rol.listarTodos();
      res.json(filas);
    } catch (error) {
      res.status(500).json({ mensaje: `Error al listar roles: ${error.message}` });
    }
  }

  /**
   * Crea un rol nuevo para control de permisos.
   */
  static async guardar(req, res) {
    const { nombre, descripcion, permisos } = req.body;

    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre del rol es obligatorio' });
    }

    try {
      const id = await Rol.crear({ nombre, descripcion, permisos: permisos ?? {} });
      res.status(201).json({ id, mensaje: 'Rol creado exitosamente' });
    } catch (error) {
      res.status(500).json({ mensaje: `Error al crear el rol: ${error.message}` });
    }
  }

  /** Actualiza nombre, descripcion y objeto permisos (serializado como JSON en columna roles.permisos). */
  static async actualizar(req, res) {
    const { nombre, descripcion, permisos } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ mensaje: 'El nombre del rol es obligatorio' });
    }
    try {
      await Rol.actualizar(req.params.id, { nombre: String(nombre).trim(), descripcion, permisos: permisos ?? {} });
      res.json({ mensaje: 'Rol actualizado' });
    } catch (error) {
      res.status(500).json({ mensaje: error.message });
    }
  }

  static async eliminar(req, res) {
    try {
      await Rol.eliminar(req.params.id);
      res.json({ mensaje: 'Rol eliminado' });
    } catch (error) {
      res.status(400).json({ mensaje: error.message });
    }
  }
}

export default ControladorRoles;
