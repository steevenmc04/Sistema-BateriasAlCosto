import pool from '../configuracion/baseDeDatos.js';

/**
 * @class InventarioVario
 * @description Modelo de Datos: Inventario Vario (productos varios sin código BAT). Maneja inventario de artículos diversos.
 * @tabla inventario_varios
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */

/** Productos VAR-XXXX desde inventario_varios */
class InventarioVario {
  static async listarTodos() {
    const [filas] = await pool.query(
      'SELECT * FROM inventario_varios ORDER BY codigo DESC'
    );
    return filas;
  }

  static async buscarEnVivo(termino) {
    const t = `%${String(termino || '').trim()}%`;
    if (t === '%%') return [];
    const [filas] = await pool.query(
      `SELECT * FROM inventario_varios
       WHERE codigo LIKE ? OR nombre LIKE ?
       ORDER BY cantidad DESC, nombre
       LIMIT 50`,
      [t, t]
    );
    return filas;
  }

  static async obtenerPorCodigo(codigo) {
    const [filas] = await pool.query(
      'SELECT * FROM inventario_varios WHERE codigo = ? LIMIT 1',
      [codigo]
    );
    return filas[0] || null;
  }

  /**
   * Genera siguiente código VAR-nnnn consultando el máximo número en BD (no usar localStorage).
   */
  static async siguienteCodigoAuto() {
    const [filas] = await pool.query(
      `SELECT codigo FROM inventario_varios WHERE codigo REGEXP '^VAR-[0-9]+$'
       ORDER BY CAST(SUBSTRING(codigo, 5) AS UNSIGNED) DESC LIMIT 1`
    );
    let n = 1;
    if (filas.length) {
      const m = filas[0].codigo.match(/^VAR-(\d+)$/);
      if (m) n = Number(m[1]) + 1;
    }
    return `VAR-${String(n).padStart(4, '0')}`;
  }

  static async crear(data) {
    let codigo;
    let intentos = 0;
    while (intentos < 20) {
      intentos++;
      codigo = await InventarioVario.siguienteCodigoAuto();
      const duplicado = await InventarioVario.obtenerPorCodigo(codigo);
      if (!duplicado) break;
    }
    await pool.query(
      `INSERT INTO inventario_varios (codigo, nombre, descripcion, cantidad, estado_stock, precio)
       VALUES (?, ?, ?, ?, 'normal', ?)`,
      [codigo, data.nombre, data.descripcion || null, Math.max(0, Number(data.cantidad) || 0), data.precio]
    );
    return codigo;
  }

  static async actualizar(id, data) {
    const cant = Math.max(0, Number(data.cantidad));
    const estado = cant <= 0 ? 'sin_stock' : 'normal';
    await pool.query(
      `UPDATE inventario_varios SET nombre = ?, descripcion = ?, cantidad = ?, precio = ?, estado_stock = ? WHERE id = ?`,
      [
        data.nombre,
        data.descripcion || null,
        cant,
        data.precio,
        estado,
        id,
      ]
    );
  }

  static async eliminar(id) {
    await pool.query('DELETE FROM inventario_varios WHERE id = ?', [id]);
  }

  static async obtenerPorIdBloqueo(connection, id) {
    const [filas] = await connection.query('SELECT * FROM inventario_varios WHERE id = ? FOR UPDATE', [id]);
    return filas[0] || null;
  }

  static async actualizarCantidad(connection, id, nuevaCantidad) {
    const c = Math.max(0, Number(nuevaCantidad));
    await connection.query(
      `UPDATE inventario_varios SET cantidad = ?, estado_stock = IF(? <= 0, 'sin_stock', 'normal') WHERE id = ?`,
      [c, c, id]
    );
  }
}

export default InventarioVario;
