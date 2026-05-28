import OperacionesInventario from '../modelos/OperacionesInventario.js';

/**
 * Reportes financieros/operativos leyendo directamente inventario_* y ledger (MySQL).
 * El PDF se arma en cliente (jspdf); aquí solo se entregan filas consistentes para gráficas/tablas.
 */
class ControladorInformes {
  static async obtener(req, res) {
    const { tipo } = req.params;
    const { desde, hasta } = req.query;

    try {
      if (tipo.startsWith('ventas')) {
        let registros = await OperacionesInventario.listarVentasInventario({
          desde: desde || undefined,
          hasta: hasta || undefined,
        });

        if (tipo === 'ventas_bateria') {
          registros = registros.filter(r => r.tipo === 'bateria');
        } else if (tipo === 'ventas_varios') {
          registros = registros.filter(r => r.tipo === 'varios');
        }

        const totCant = registros.reduce((a, x) => a + Number(x.cantidad || 0), 0);
        const totMonto = registros.reduce((a, x) => a + Number(x.total || 0), 0);
        const totCosto = registros.reduce(
          (a, x) => a + Number(x.costo_unitario || 0) * Number(x.cantidad || 0), 0
        );
        const margenUsd = Number((totMonto - totCosto).toFixed(2));
        const margenPct = totMonto > 0 ? Number(((margenUsd / totMonto) * 100).toFixed(1)) : 0;
        return res.json({
          registros,
          totales: {
            cantidad: totCant,
            monto_usd: Number(totMonto.toFixed(2)),
            costo_usd: Number(totCosto.toFixed(2)),
            margen_usd: margenUsd,
            margen_porcentaje: margenPct,
          },
        });
      }

      if (tipo === 'compras') {
        const registros = await OperacionesInventario.listarComprasInv({
          desde: desde || undefined,
          hasta: hasta || undefined,
        });
        const totCant = registros.reduce((a, x) => a + Number(x.cantidad || 0), 0);
        const totMonto = registros.reduce((a, x) => a + Number(x.total || 0), 0);
        return res.json({ registros, totales: { cantidad: totCant, monto_usd: Number(totMonto.toFixed(2)) } });
      }

      if (tipo === 'chatarra') {
        const registros = await OperacionesInventario.listarChatarraInv({
          desde: desde || undefined,
          hasta: hasta || undefined,
        });
        const totCant = registros.reduce((a, x) => a + Number(x.cantidad || 0), 0);
        const totMonto = registros.reduce((a, x) => a + Number(x.total || 0), 0);
        return res.json({ registros, totales: { cantidad: totCant, monto_usd: Number(totMonto.toFixed(2)) } });
      }

      if (tipo === 'inventario') {
        const registros = await OperacionesInventario.snapshotInventario();
        const totCant = registros.reduce((a, x) => a + Number(x.cantidad || 0), 0);
        return res.json({ registros, totales: { cantidad_unidades: totCant } });
      }

      return res.status(400).json({
        mensaje: 'tipo inválido (ventas | compras | chatarra | inventario)',
      });
    } catch (e) {
      return res.status(500).json({ mensaje: e.message });
    }
  }
}

export default ControladorInformes;
