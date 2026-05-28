/**
 * @class Reporte
 * @description Modelo de datos para reportes y métricas.
 * @tabla (no aplica)
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
import pool from '../configuracion/baseDeDatos.js';

/**
 * Filtro temporal sobre columnas `fecha` del modelo nuevo (ventas_inventario / chatarra_inventario).
 */
const filtroPorPeriodo = (periodo, alias = '') => {
  const col = alias ? `${alias}.fecha` : 'fecha';
  if (periodo === 'semana') return `${col} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
  if (periodo === 'mes') return `${col} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
  return `DATE(${col}) = CURDATE()`;
};

/**
 * Métricas para `/api/reportes/metricas/:periodo` — ya no usa tablas legacy ventas / compras_chatarra.
 */
class Reporte {
  static async metricasPorPeriodo(periodo) {
    const filtroVentas = filtroPorPeriodo(periodo, 'v');
    const filtroChat = filtroPorPeriodo(periodo, 'c');

    const [ventas] = await pool.query(
      `SELECT COALESCE(SUM(v.total), 0) AS total, COUNT(*) AS cantidad
       FROM ventas_inventario v
       WHERE ${filtroVentas}`
    );
    const [chatarra] = await pool.query(
      `SELECT COALESCE(SUM(c.total), 0) AS total, COALESCE(SUM(c.cantidad), 0) AS peso
       FROM chatarra_inventario c
       WHERE ${filtroChat}`
    );

    return {
      periodo,
      estadisticas: {
        ventas: ventas[0],
        chatarra: chatarra[0],
      },
    };
  }
}

export default Reporte;
