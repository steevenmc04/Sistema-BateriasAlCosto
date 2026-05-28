import pool from '../configuracion/baseDeDatos.js';

/**
 * @class Dashboard
 * @description Modelo de Datos: Dashboard (Métricas en tiempo real). Proporciona resúmenes ejecutivos y KPIs financieros/operativos para la pantalla de inicio.
 * @tabla dashboard
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
class Dashboard {
  /**
   * Obtiene un resumen consolidado de métricas clave para el Dashboard.
   */
  static async resumen() {
    // 1. Ventas del día de hoy
    const [ventasHoy] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM ventas
       WHERE DATE(creado_en) = CURDATE() AND estado = 'pagada'`
    );

    // 2. Total de unidades físicas en stock
    const [unidadesStock] = await pool.query(
      'SELECT COALESCE(SUM(cantidad), 0) AS n FROM inventario_stock'
    );

    // 3. SKUs de productos con stock disponible
    const [skusActivos] = await pool.query(
      'SELECT COUNT(*) AS c FROM inventario_stock WHERE cantidad > 0'
    );

    // 4. Cantidad de productos en alerta (por debajo de su stock mínimo parametrizado)
    const [alertasStock] = await pool.query(
      `SELECT COUNT(*) AS c 
       FROM productos p
       JOIN inventario_stock s ON p.id = s.producto_id
       WHERE s.cantidad <= p.stock_minimo AND p.activo = 1`
    );

    // 5. Total de usuarios activos
    const [usuarios] = await pool.query(
      "SELECT COUNT(*) AS total FROM usuarios WHERE estado = 'activo'"
    );

    return {
      ventasHoy: parseFloat(ventasHoy[0].total || 0),
      stockTotal: parseInt(unidadesStock[0].n || 0),
      skusActivos: parseInt(skusActivos[0].c || 0),
      alertasStock: parseInt(alertasStock[0].c || 0),
      totalUsuarios: parseInt(usuarios[0].total || 0)
    };
  }
}

export default Dashboard;
