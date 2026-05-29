import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { informesAPI } from '../servicios/servicios.js';
import { safeNumber } from '../utilidades/safeNumber.js';

const OPCIONES_TIPO_REPORTE = [
  { label: 'Ventas (Todas)', value: 'ventas_todas' },
  { label: 'Venta Baterías', value: 'venta_baterias' },
  { label: 'Venta Varios', value: 'venta_varios' },
  { label: 'Venta Chatarra', value: 'venta_chatarra' },
  { label: 'Compras (Todas)', value: 'compras_todas' },
  { label: 'Compra Baterías', value: 'compra_baterias' },
  { label: 'Compra Varios', value: 'compra_varios' },
  { label: 'Compra Chatarra', value: 'compra_chatarra' },
  { label: 'Inventario Actual', value: 'inventario_actual' },
];

const tituloPorTipo = Object.fromEntries(OPCIONES_TIPO_REPORTE.map((o) => [o.value, o.label]));

const obtenerFechaMovimiento = (item = {}) => {
  return (
    item.fecha ||
    item.creado_en ||
    item.created_at ||
    item.fecha_venta ||
    item.fecha_compra ||
    item.fecha_operacion ||
    item.actualizado_en ||
    item.fecha_ref ||
    null
  );
};

const estaEnRango = (item, fechaInicio, fechaFin) => {
  const fecha = obtenerFechaMovimiento(item);
  if (!fecha) return false;

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;

  const inicio = fechaInicio ? new Date(fechaInicio) : null;
  const fin = fechaFin ? new Date(fechaFin) : null;

  if (inicio && d < inicio) return false;
  if (fin) {
    fin.setHours(23, 59, 59, 999);
    if (d > fin) return false;
  }
  return true;
};

const esBateria = (item = {}) => {
  const texto = [
    item.categoria,
    item.tipo_producto,
    item.tipo,
    item.nombre_categoria,
    item.descripcion,
    item.tipo_caja,
    item.marca,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    item.es_bateria === true ||
    texto.includes('bateria') ||
    texto.includes('batería') ||
    Boolean(item.tipo_caja)
  );
};

const esChatarra = (item = {}) => {
  const texto = [
    item.categoria,
    item.tipo_producto,
    item.tipo,
    item.tipo_operacion,
    item.descripcion,
    item.nombre,
    item.clase,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return texto.includes('chatarra');
};

const esVario = (item = {}) => !esBateria(item) && !esChatarra(item);

const inicioDia = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const finDia = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const fmtInput = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const aplicarRango = (tipo) => {
  const hoy = inicioDia(new Date());
  if (tipo === 'hoy') return { desde: hoy, hasta: finDia(hoy) };
  if (tipo === 'semana') {
    const base = new Date(hoy);
    base.setDate(hoy.getDate() - hoy.getDay());
    return { desde: inicioDia(base), hasta: finDia(new Date()) };
  }
  if (tipo === 'mes') {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return { desde: inicioDia(ini), hasta: finDia(new Date()) };
  }
  if (tipo === 'mes_anterior') {
    const primer = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return { desde: inicioDia(primer), hasta: finDia(ultimo) };
  }
  return { desde: hoy, hasta: finDia(hoy) };
};

const formatearFecha = (f) => {
  if (!f) return '-';
  try {
    const d = new Date(f);
    if (Number.isNaN(d.getTime())) return String(f);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(f);
  }
};

const obtenerCodigoManual = (r = {}) => {
  if (r.codigo_manual && String(r.codigo_manual).trim()) {
    return String(r.codigo_manual).trim();
  }
  if (r.codigo_resuelto && String(r.codigo_resuelto).trim()) {
    return String(r.codigo_resuelto).trim();
  }
  if (r.notas) {
    const match = String(r.notas).match(/Ref\.\sfísica\/SRI:\s*([^|]+)/i);
    if (match && match[1]) return match[1].trim();
  }
  return r.codigo_bateria || r.codigo_item || r.codigo || r.ref || '-';
};

const normalizarVenta = (item = {}) => {
  const categoriaMovimiento = esBateria(item) || String(item.tipo || '').toLowerCase() === 'bateria'
    ? 'bateria'
    : 'varios';

  return {
    id: `venta-${item.id ?? item.codigo_item ?? Math.random().toString(36).slice(2)}`,
    fecha: obtenerFechaMovimiento(item),
    tipoMovimiento: categoriaMovimiento === 'bateria' ? 'Venta Batería' : 'Venta Varios',
    categoriaMovimiento,
    codigo: obtenerCodigoManual(item),
    producto: [item.marca, item.tipo_caja, item.condicion].filter(Boolean).join(' · ') || item.codigo_item || 'Producto',
    clienteProveedor: item.nombre_cliente || 'Consumidor Final',
    usuario: item.usuario_nombre || '-',
    cantidad: safeNumber(item.cantidad),
    total: safeNumber(item.total),
    iva: safeNumber(item.con_iva) === 1 ? 'Con IVA' : 'Sin IVA',
    origen: 'ventas',
    operacion: 'venta',
  };
};

const normalizarCompra = (item = {}) => {
  const categoriaMovimiento = esBateria(item) ? 'bateria' : esVario(item) ? 'varios' : 'varios';

  return {
    id: `compra-${item.id ?? item.codigo_item ?? Math.random().toString(36).slice(2)}`,
    fecha: obtenerFechaMovimiento(item),
    tipoMovimiento: categoriaMovimiento === 'bateria' ? 'Compra Batería' : 'Compra Varios',
    categoriaMovimiento,
    codigo: obtenerCodigoManual(item),
    producto: [item.marca, item.tipo_caja, item.condicion].filter(Boolean).join(' · ') || item.codigo_item || 'Producto',
    clienteProveedor: item.proveedor || '-',
    usuario: item.usuario_nombre || '-',
    cantidad: safeNumber(item.cantidad),
    total: safeNumber(item.total),
    iva: 'Sin IVA',
    origen: 'compras',
    operacion: 'compra',
  };
};

const normalizarChatarra = (item = {}) => {
  const tipoOperacion = String(item.tipo_operacion || '').toLowerCase();
  const esEntrada = tipoOperacion === 'entrada' || tipoOperacion === 'compra';

  return {
    id: `chatarra-${item.id ?? item.codigo_item ?? Math.random().toString(36).slice(2)}`,
    fecha: obtenerFechaMovimiento(item),
    tipoMovimiento: esEntrada ? 'Compra Chatarra' : 'Venta Chatarra',
    categoriaMovimiento: 'chatarra',
    codigo: obtenerCodigoManual(item),
    producto: [item.marca, item.tipo_caja].filter(Boolean).join(' · ') || item.tipo_caja || 'Chatarra',
    clienteProveedor: item.nombre_cliente_proveedor || '-',
    usuario: item.usuario_nombre || '-',
    cantidad: safeNumber(item.cantidad),
    total: safeNumber(item.total),
    iva: 'Sin IVA',
    origen: 'chatarra',
    operacion: esEntrada ? 'compra' : 'venta',
  };
};

const normalizarInventario = (item = {}) => {
  const total = safeNumber(item.cantidad) * safeNumber(item.precio);
  const categoriaMovimiento = esChatarra(item)
    ? 'chatarra'
    : esBateria(item)
      ? 'bateria'
      : 'varios';

  const tipoMovimiento =
    categoriaMovimiento === 'chatarra'
      ? 'Inventario Chatarra'
      : categoriaMovimiento === 'bateria'
        ? 'Inventario Batería'
        : 'Inventario Varios';

  return {
    id: `inv-${item.ref ?? item.codigo ?? Math.random().toString(36).slice(2)}`,
    fecha: obtenerFechaMovimiento(item),
    tipoMovimiento,
    categoriaMovimiento,
    codigo: item.ref || item.codigo || '-',
    producto: [item.marca, item.tipo_caja, item.condicion].filter(Boolean).join(' · ') || item.nombre || 'Inventario',
    clienteProveedor: '-',
    usuario: '-',
    cantidad: safeNumber(item.cantidad),
    total,
    iva: '-',
    origen: 'inventario',
    operacion: 'inventario',
    estado_stock: item.estado_stock,
  };
};

const ordenarPorFechaDesc = (arr = []) =>
  [...arr].sort((a, b) => {
    const da = new Date(a.fecha || 0).getTime();
    const db = new Date(b.fecha || 0).getTime();
    return db - da;
  });

export function useVistaReportes() {
  const [tipo, setTipo] = useState('ventas_todas');
  const rangoInicial = aplicarRango('mes');
  const [rangoRapido, setRangoRapido] = useState('mes');
  const [desde, setDesde] = useState(fmtInput(rangoInicial.desde));
  const [hasta, setHasta] = useState(fmtInput(rangoInicial.hasta));
  const [registros, setRegistros] = useState([]);
  const [totales, setTotales] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const aplicarPreset = (clave) => {
    setRangoRapido(clave);
    const { desde: d1, hasta: d2 } = aplicarRango(clave);
    setDesde(fmtInput(d1));
    setHasta(fmtInput(d2));
  };

  const refrescarVista = useCallback(async () => {
    setError('');
    setCargando(true);
    try {
      if (tipo === 'inventario_actual') {
        const { data } = await informesAPI.obtener('inventario', {});
        const inventario = (data.registros || []).map(normalizarInventario);
        const totalCantidad = inventario.reduce((ac, r) => ac + safeNumber(r.cantidad), 0);
        const totalMonto = inventario.reduce((ac, r) => ac + safeNumber(r.total), 0);

        setRegistros(inventario);
        setTotales({
          cantidad: totalCantidad,
          cantidad_unidades: totalCantidad,
          monto_usd: Number(totalMonto.toFixed(2)),
        });
        return;
      }

      const [ventasRes, comprasRes, chatarraRes] = await Promise.all([
        informesAPI.obtener('ventas', { desde, hasta }),
        informesAPI.obtener('compras', { desde, hasta }),
        informesAPI.obtener('chatarra', { desde, hasta }),
      ]);

      const ventas = (ventasRes.data?.registros || []).map(normalizarVenta).filter((r) => estaEnRango(r, desde, hasta));
      const compras = (comprasRes.data?.registros || []).map(normalizarCompra).filter((r) => estaEnRango(r, desde, hasta));
      const chatarra = (chatarraRes.data?.registros || []).map(normalizarChatarra).filter((r) => estaEnRango(r, desde, hasta));

      let filtrados = [];
      if (tipo === 'ventas_todas') {
        filtrados = [...ventas, ...chatarra.filter((r) => r.operacion === 'venta')];
      } else if (tipo === 'venta_baterias') {
        filtrados = ventas.filter((r) => r.categoriaMovimiento === 'bateria');
      } else if (tipo === 'venta_varios') {
        filtrados = ventas.filter((r) => r.categoriaMovimiento === 'varios');
      } else if (tipo === 'venta_chatarra') {
        filtrados = chatarra.filter((r) => r.operacion === 'venta');
      } else if (tipo === 'compras_todas') {
        filtrados = [...compras, ...chatarra.filter((r) => r.operacion === 'compra')];
      } else if (tipo === 'compra_baterias') {
        filtrados = compras.filter((r) => r.categoriaMovimiento === 'bateria');
      } else if (tipo === 'compra_varios') {
        filtrados = compras.filter((r) => r.categoriaMovimiento === 'varios');
      } else if (tipo === 'compra_chatarra') {
        filtrados = chatarra.filter((r) => r.operacion === 'compra');
      }

      const ordenados = ordenarPorFechaDesc(filtrados);
      const totalCantidad = ordenados.reduce((ac, r) => ac + safeNumber(r.cantidad), 0);
      const totalMonto = ordenados.reduce((ac, r) => ac + safeNumber(r.total), 0);

      setRegistros(ordenados);
      setTotales({
        cantidad: totalCantidad,
        monto_usd: Number(totalMonto.toFixed(2)),
      });
    } catch (e) {
      setError(e.response?.data?.mensaje || e.message || 'No se pudo cargar reportes');
    } finally {
      setCargando(false);
    }
  }, [tipo, desde, hasta]);

  const generarPDF = async (puedePdf) => {
    if (!puedePdf) return;
    setError('');
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Reporte: ${tituloPorTipo[tipo] || tipo}`, 40, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        tipo === 'inventario_actual'
          ? 'Rango: Inventario actual'
          : `Rango: ${desde} a ${hasta}`,
        40,
        60
      );

      const head = [['Fecha', 'Tipo', 'Código', 'Producto', 'Cliente / Proveedor', 'Cant.', 'IVA?', 'Total USD']];
      const body = (registros || []).map((r) => [
        formatearFecha(r.fecha),
        r.tipoMovimiento || '-',
        r.codigo || '-',
        r.producto || '-',
        r.clienteProveedor || '-',
        String(safeNumber(r.cantidad)),
        r.iva || '-',
        safeNumber(r.total).toFixed(2),
      ]);

      autoTable(doc, {
        startY: 78,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 5, valign: 'middle' },
        headStyles: { fillColor: [16, 16, 16], textColor: [227, 198, 106], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 248] },
      });

      const finalY = doc.lastAutoTable?.finalY || 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Total unidades: ${safeNumber(totales?.cantidad).toFixed(0)}`, 40, finalY + 22);
      doc.text(`Total USD: ${safeNumber(totales?.monto_usd).toFixed(2)}`, 200, finalY + 22);

      const nombre = (tituloPorTipo[tipo] || tipo).replace(/\s+/g, '_');
      doc.save(`Reporte_${nombre}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      setError(e.message || 'No se pudo generar PDF');
    }
  };

  return {
    tipo,
    setTipo,
    opcionesTipoReporte: OPCIONES_TIPO_REPORTE,
    rangoRapido,
    desde,
    setDesde,
    hasta,
    setHasta,
    aplicarPreset,
    registros,
    totales,
    cargando,
    error,
    refrescarVista,
    generarPDF,
    formatearFecha,
  };
}
