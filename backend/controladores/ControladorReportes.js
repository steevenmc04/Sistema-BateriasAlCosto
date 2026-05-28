import Reporte from '../modelos/Reporte.js';

class ControladorReportes {
  /**
   * Valida periodo y devuelve métricas para exportación PDF.
   */
  static async obtenerMetricas(req, res) {
    const { periodo } = req.params;
    if (!['dia', 'semana', 'mes'].includes(periodo)) {
      return res.status(400).json({ mensaje: 'Periodo inválido (dia, semana, mes)' });
    }

    try {
      const datos = await Reporte.metricasPorPeriodo(periodo);
      res.json({
        ...datos,
        fecha: new Date().toLocaleDateString(),
      });
    } catch (error) {
      res.status(500).json({ mensaje: `Error al generar reporte: ${error.message}` });
    }
  }
}

export default ControladorReportes;
