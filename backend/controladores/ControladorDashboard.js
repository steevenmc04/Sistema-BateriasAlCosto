import Dashboard from '../modelos/Dashboard.js';

class ControladorDashboard {
  /**
   * Responde métricas rápidas para el panel de inicio.
   */
  static async obtenerResumen(req, res) {
    try {
      const datos = await Dashboard.resumen();
      res.json(datos);
    } catch (error) {
      res.status(500).json({ mensaje: `Error al cargar dashboard: ${error.message}` });
    }
  }
}

export default ControladorDashboard;
