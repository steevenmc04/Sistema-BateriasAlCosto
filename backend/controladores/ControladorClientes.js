import Cliente from '../modelos/Cliente.js';
import Logger from '../utilidades/logger.js';

class ControladorClientes {
  static async buscar(req, res) {
    try {
      const { q, limite = 20 } = req.query;
      const clientes = await Cliente.listar({ buscar: q || '', limite: parseInt(limite) });
      return res.status(200).json(clientes);
    } catch (error) {
      Logger.error('Clientes', 'Error al buscar clientes', error);
      return res.status(500).json({ ok: false, error: 'Error al buscar clientes' });
    }
  }

  static async obtener(req, res) {
    try {
      const { id } = req.params;
      const cliente = await Cliente.obtenerPorId(id);
      if (!cliente) {
        return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
      }
      return res.status(200).json(cliente);
    } catch (error) {
      Logger.error('Clientes', 'Error al obtener cliente', error);
      return res.status(500).json({ ok: false, error: 'Error al obtener cliente' });
    }
  }

  static async crear(req, res) {
    try {
      const { nombre, tipo_documento, documento, telefono, email, direccion } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ ok: false, error: 'Nombre es obligatorio' });
      }
      const id = await Cliente.crear({ nombre, tipo_documento, documento, telefono, email, direccion });
      return res.status(201).json({ ok: true, data: { id }, message: 'Cliente creado exitosamente' });
    } catch (error) {
      Logger.error('Clientes', 'Error al crear cliente', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ ok: false, error: 'El documento ya existe' });
      }
      return res.status(500).json({ ok: false, error: 'Error al crear cliente' });
    }
  }
}

export default ControladorClientes;
