import pool from '../configuracion/baseDeDatos.js';

class Cliente {
  static async listar({ buscar = '', limite = 20 } = {}) {
    let sql = `SELECT id, nombre, tipo_documento, documento, telefono, email, direccion 
               FROM clientes WHERE 1=1`;
    const params = [];

    if (buscar) {
      sql += ' AND (nombre LIKE ? OR documento LIKE ? OR telefono LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
    }

    sql += ' ORDER BY nombre ASC LIMIT ?';
    params.push(parseInt(limite));

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  static async buscarPorDocumento(documento) {
    const [filas] = await pool.query(
      'SELECT id, nombre, tipo_documento, documento, telefono, email, direccion FROM clientes WHERE documento = ?',
      [documento]
    );
    return filas[0] || null;
  }

  static async obtenerPorId(id) {
    const [filas] = await pool.query(
      'SELECT id, nombre, tipo_documento, documento, telefono, email, direccion FROM clientes WHERE id = ?',
      [id]
    );
    return filas[0] || null;
  }

  static async crear({ nombre, tipo_documento = 'cedula', documento = null, telefono = null, email = null, direccion = null }) {
    const [resultado] = await pool.query(
      `INSERT INTO clientes (nombre, tipo_documento, documento, telefono, email, direccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, tipo_documento, documento, telefono, email, direccion]
    );
    return resultado.insertId;
  }

  static async actualizar(id, { nombre, tipo_documento, documento, telefono = null, email = null, direccion = null }) {
    await pool.query(
      `UPDATE clientes 
       SET nombre = ?, tipo_documento = ?, documento = ?, telefono = ?, email = ?, direccion = ?
       WHERE id = ?`,
      [nombre, tipo_documento, documento, telefono, email, direccion, id]
    );
  }
}

export default Cliente;
