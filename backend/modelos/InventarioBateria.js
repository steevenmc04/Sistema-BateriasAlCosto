import pool from '../configuracion/baseDeDatos.js';

function siguienteCodigoBatDesdeFilas(filas) {
  let maxN = 0;
  for (const r of filas || []) {
    const m = String(r.codigo).match(/^BAT-(\d+)$/);
    if (m) maxN = Math.max(maxN, Number(m[1]));
  }
  return `BAT-${String(maxN + 1).padStart(4, '0')}`;
}

/**
 * @class InventarioBateria
 * @description Modelo de Datos: Inventario de baterías (referencia BAT-xxxx). Gestiona el inventario principal de baterías con código autogenerado.
 * @tabla inventario_baterias
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
class InventarioBateria {
  static async listarTodos() {
    const [filas] = await pool.query(
      'SELECT id, codigo, marca, condicion, tipo_caja, cantidad, estado_stock, precio, fecha_creacion, fecha_actualizacion FROM inventario_baterias ORDER BY marca, tipo_caja, codigo'
    );
    return filas;
  }

  /** Busca por código exacto para ventas/autocompletado. */
  static async obtenerPorCodigo(codigo) {
    const [filas] = await pool.query('SELECT * FROM inventario_baterias WHERE codigo = ? LIMIT 1', [
      codigo,
    ]);
    return filas[0] || null;
  }

  /**
   * Búsqueda en tiempo real por código parcial o marca/tipo de caja.
   */
  static async buscarEnVivo(termino) {
    const t = `%${String(termino || '').trim()}%`;
    if (t === '%%') return [];
    const [filas] = await pool.query(
      `SELECT * FROM inventario_baterias
       WHERE codigo LIKE ? OR marca LIKE ? OR tipo_caja LIKE ?
       ORDER BY cantidad DESC, marca
       LIMIT 50`,
      [t, t, t]
    );
    return filas;
  }

  /** Fila agrupadora para compras: misma marca + caja + condición (puede haber varios códigos). */
  static async encontrarRepresentantePorCombo(marca, tipoCaja, condicion) {
    const [filas] = await pool.query(
      `SELECT * FROM inventario_baterias
       WHERE marca = ? AND tipo_caja = ? AND condicion = ?
       ORDER BY id ASC LIMIT 1`,
      [marca, tipoCaja, condicion]
    );
    return filas[0] || null;
  }

  /** Próximo correlativo BAT-nnnn según filas ya leídas (útil dentro de transacción). */
  static async siguienteCodigoLibreEnConexion(con) {
    const [rows] = await con.query(
      `SELECT codigo FROM inventario_baterias WHERE codigo REGEXP '^BAT-[0-9]+$'`
    );
    return siguienteCodigoBatDesdeFilas(rows);
  }

  static async siguienteCodigoLibre() {
    const [rows] = await pool.query(
      `SELECT codigo FROM inventario_baterias WHERE codigo REGEXP '^BAT-[0-9]+$'`
    );
    return siguienteCodigoBatDesdeFilas(rows);
  }

  /**
   * Alta de batería. Si no viene `codigo`, genera BAT-xxxx único.
   * @returns {Promise<string>} código asignado
   */
  static async crear(data) {
    const { codigo: codigoManual, marca, condicion, tipo_caja, cantidad = 1, precio } = data;
    let codigo = codigoManual?.trim();
    let intentos = 0;
    while (intentos < 50) {
      intentos++;
      if (!codigo) {
        codigo = await InventarioBateria.siguienteCodigoLibre();
      }
      try {
        await pool.query(
          `INSERT INTO inventario_baterias (codigo, marca, condicion, tipo_caja, cantidad, estado_stock, precio)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [codigo, marca, condicion, tipo_caja, Math.max(1, Number(cantidad)), 'normal', precio]
        );
        return codigo;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          if (codigoManual?.trim()) {
            throw new Error('Esta referencia ya está registrada');
          }
          codigo = null;
          continue;
        }
        throw e;
      }
    }
    throw new Error('No se pudo asignar una referencia única');
  }

  static async actualizar(id, data) {
    const { marca, condicion, tipo_caja, cantidad, precio } = data;
    const cant = Number(cantidad);
    const estado = cant <= 0 ? 'sin_stock' : 'normal';
    await pool.query(
      `UPDATE inventario_baterias SET marca = ?, condicion = ?, tipo_caja = ?, cantidad = ?,
       precio = ?, estado_stock = ? WHERE id = ?`,
      [marca, condicion, tipo_caja, Math.max(0, cant), precio, estado, id]
    );
  }

  static async eliminar(id) {
    await pool.query('DELETE FROM inventario_baterias WHERE id = ?', [id]);
  }

  static async obtenerPorIdBloqueo(connection, id) {
    const [filas] = await connection.query(
      'SELECT * FROM inventario_baterias WHERE id = ? FOR UPDATE',
      [id]
    );
    return filas[0] || null;
  }

  /** Persiste cantidad después de calcular saldo en código (dentro de transacción). */
  static async actualizarCantidadYSaldo(connection, id, nuevaCantidad) {
    const c = Math.max(0, Number(nuevaCantidad));
    await connection.query(
      `UPDATE inventario_baterias SET cantidad = ?, estado_stock = IF(? <= 0, 'sin_stock', 'normal') WHERE id = ?`,
      [c, c, id]
    );
  }
}

export default InventarioBateria;
