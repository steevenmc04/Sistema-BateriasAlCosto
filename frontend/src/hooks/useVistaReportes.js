import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiCliente, { apiUrl, informesAPI } from '../servicios/servicios.js';
import { safeNumber } from '../utilidades/safeNumber.js';

const loadBase64Image = (url) => {
  return new Promise((resolve, reject) => {
    // Timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout loading image'));
    }, 5000);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve({ dataURL, width: img.width, height: img.height });
      } catch (e) {
        clearTimeout(timeoutId);
        reject(e);
      }
    };
    
    img.onerror = (e) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    try {
      img.src = url;
    } catch (e) {
      clearTimeout(timeoutId);
      reject(e);
    }
  });
};

const formatearFecha = (f) => {
  if (!f) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return String(f);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return String(f);
  }
};

const obtenerCodigoBateria = (r) => {
  if (r.notas) {
    const match = r.notas.match(/Ref\.\sfísica\/SRI:\s*([^|]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return r.codigo_item || '-';
};

function inicioDia(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function finDia(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function fmtInput(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function aplicarRango(tipo) {
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
}

/**
 * Reportes leyendo `/api/informes/:tipo` con filtros de fecha (MySQL).
 */
export function useVistaReportes() {
  const [tipo, setTipo] = useState('ventas');
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
      if (tipo === 'inventario') {
        const { data } = await informesAPI.obtener('inventario', {});
        setRegistros(data.registros || []);
        setTotales(data.totales || null);
        return;
      }
      const { data } = await informesAPI.obtener(tipo, { desde, hasta });
      setRegistros(data.registros || []);
      setTotales(data.totales || null);
    } catch (e) {
      setError(e.response?.data?.mensaje || e.message);
    } finally {
      setCargando(false);
    }
  }, [tipo, desde, hasta]);

  const generarPDF = async (puedePdf) => {
    if (!puedePdf) return;
    setError('');
    setCargando(true);
    try {
      const params = tipo === 'inventario' ? {} : { desde, hasta };
      const { data } = await informesAPI.obtener(tipo, params);
      const rows = data.registros || [];
      const tot = data.totales || {};

// 1. Obtener Datos de la Empresa
       let empresa = {
         ruc: '0917688871001',
         direccion: 'Carchi #1936 y Ayacucho',
         telefono: '0999999999',
         email: 'info@bateriasalcosto.com'
       };
      try {
        const { data: config } = await apiCliente.get(apiUrl('/api/facturas/config'));
        if (config && config.ruc) {
          empresa = config;
        }
      } catch (e) {
        console.warn('Usando valores de empresa por defecto:', e);
      }

      // 2. Intentar Cargar Logo (Primero logoParaFactura, luego logo)
      let logoInfo = null;
      try {
        logoInfo = await loadBase64Image(import.meta.env.BASE_URL + 'logoParaFactura.png');
      } catch (e) {
        try {
          logoInfo = await loadBase64Image(import.meta.env.BASE_URL + 'logo.png');
        } catch (err) {
          console.error("No se pudo cargar ningún logo:", err);
        }
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      // COLORES Y ESTILOS
      const colorPrincipal = [15, 23, 42]; // #0f172a (dark-900)
      const colorSecundario = [71, 85, 105]; // #475569 (slate-600)
      const colorAcento = [234, 179, 8]; // #eab308 (yellow-500)

      // 3. LOGO Y ENCABEZADO
      if (logoInfo) {
        const targetWidth = 140;
        const targetHeight = targetWidth * (logoInfo.height / logoInfo.width);
        doc.addImage(logoInfo.dataURL, 'PNG', 50, 45, targetWidth, targetHeight);
      } else {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(colorAcento[0], colorAcento[1], colorAcento[2]);
        doc.text('BATERÍAS AL COSTO', 50, 70);
      }

      // DATOS DE LA EMPRESA
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
      doc.text(`RUC: ${empresa.ruc}`, 50, 140);
      doc.text(empresa.direccion, 50, 152);
      doc.text(`Tel: ${empresa.telefono || ''} · ${empresa.email || ''}`, 50, 164);

      // CUADRO DE REPORTE (Derecha arriba)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.roundedRect(380, 45, 165, 80, 4, 4, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
      doc.text(`REPORTE DE ${tipo.toUpperCase()}`, 380 + 165 / 2, 60, { align: 'center' });

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      
      let shortTitle = '';
      if (tipo === 'ventas') shortTitle = 'VENTAS';
      else if (tipo === 'compras') shortTitle = 'COMPRAS';
      else if (tipo === 'chatarra') shortTitle = 'CHATARRA';
      else if (tipo === 'inventario') shortTitle = 'STOCK';
      
      doc.text(shortTitle, 380 + 165 / 2, 78, { align: 'center' });

      const fechaHoy = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
      doc.text(`Emisión: ${fechaHoy}`, 380 + 165 / 2, 102, { align: 'center' });

      // LÍNEA DE ACENTO (AMARILLO)
      doc.setFillColor(colorAcento[0], colorAcento[1], colorAcento[2]);
      doc.rect(50, 185, 495, 2, 'F');

      // DATOS DEL REPORTE
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      doc.text('DATOS DEL REPORTE', 50, 210);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      
      let curY = 225;
      if (tipo === 'inventario') {
        doc.text('Rango: Inventario en tiempo real (sin filtro de fecha)', 50, curY);
      } else {
        doc.text(`Rango de fechas: Desde ${desde} hasta ${hasta}`, 50, curY);
      }
      curY += 13;
      doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, 50, curY);
      curY += 13;
      doc.text(`Total registros: ${rows.length}`, 50, curY);

       const head =
         tipo === 'ventas'
           ? [['Fecha', 'Tipo', 'Código', 'Cliente', 'Vendido por', 'Cant.', 'PU USD', 'Costo USD', 'IVA?', 'Total USD']]
           : tipo === 'compras'
             ? [['Fecha', 'Marca', 'Tipo Caja', 'Condición', 'Cant.', 'Costo Unit.', 'Total USD', 'Proveedor']]
             : tipo === 'chatarra'
               ? [['Fecha', 'Operación', 'Tipo Caja', 'Cant.', 'P. Unitario', 'Total USD', 'Contraparte']]
               : [['Clase', 'Referencia', 'Marca', 'Tipo Caja', 'Condición', 'Stock', 'Costo USD', 'PVP Sugerido', 'Valorizado USD']];

       const body =
         tipo === 'ventas'
           ? rows.map((r) => [
               formatearFecha(r.fecha),
               r.tipo ? String(r.tipo).toUpperCase() : '-',
               obtenerCodigoBateria(r),
               r.nombre_cliente,
               r.usuario_nombre || '-',
               r.cantidad,
               safeNumber(r.precio_unitario).toFixed(2),
               safeNumber(r.costo_unitario || 0).toFixed(2),
               safeNumber(r.con_iva) === 1 ? 'Con IVA' : 'Sin IVA',
               safeNumber(r.total).toFixed(2),
             ])
           : tipo === 'compras'
             ? rows.map((r) => [
                 formatearFecha(r.fecha),
                 r.marca,
                 r.tipo_caja,
                 r.condicion,
                 r.cantidad,
                 safeNumber(r.precio_unitario).toFixed(2),
                 safeNumber(r.total).toFixed(2),
                 r.proveedor || '-',
               ])
             : tipo === 'chatarra'
               ? rows.map((r) => [
                   formatearFecha(r.fecha),
                   r.tipo_operacion ? String(r.tipo_operacion).toUpperCase() : '-',
                   r.tipo_caja,
                   r.cantidad,
                   safeNumber(r.precio_unitario).toFixed(2),
                   safeNumber(r.total).toFixed(2),
                   r.nombre_cliente_proveedor || '-',
                 ])
               : rows.map((r) => [
                   r.clase ? String(r.clase).toUpperCase() : '-',
                   r.ref,
                   r.marca,
                   r.tipo_caja || '-',
                   r.condicion || '-',
                   r.cantidad,
                   safeNumber(r.precio).toFixed(2),
                   safeNumber(r.precio_venta_sugerido || 0).toFixed(2),
                   safeNumber(safeNumber(r.cantidad || 0) * safeNumber(r.precio || 0)).toFixed(2),
                 ]);

      autoTable(doc, {
        startY: 275,
        head,
        body,
        styles: {
          fontSize: 8,
          cellPadding: 6,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      let finalY = doc.lastAutoTable?.finalY || 275;
      finalY += 20;

      // Si está muy cerca del final, añadimos una página
      if (finalY > 700) {
        doc.addPage();
        finalY = 50;
      }

      // Dibujar caja de TOTALES en la parte inferior derecha
      const tieneTotales = tot?.monto_usd != null || tot?.cantidad != null || tot?.cantidad_unidades != null || tot?.margen_usd != null;
      if (tieneTotales) {
        let totalLinesCount = 0;
        if (tot?.cantidad_unidades != null) totalLinesCount++;
        if (tot?.cantidad != null) totalLinesCount++;
        if (tot?.monto_usd != null) totalLinesCount++;
        if (tot?.costo_usd != null) totalLinesCount++;
        if (tot?.margen_usd != null) totalLinesCount++;
        if (tot?.margen_porcentaje != null) totalLinesCount++;
        if (tot?.promedio_diario != null) totalLinesCount++;

        const cardH = 20 + totalLinesCount * 22;
        const cardW = 245;
        const cardX = 300; // Lado derecho

        doc.setFillColor(249, 250, 251);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.roundedRect(cardX, finalY, cardW, cardH, 8, 8, 'FD');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);

        let yText = finalY + 20;

        if (tot?.cantidad_unidades != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Total Unidades Inventario:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.text(String(tot.cantidad_unidades), cardX + cardW - 15, yText, { align: 'right' });
          yText += 22;
        }

        if (tot?.cantidad != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Total Unidades:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.text(String(tot.cantidad), cardX + cardW - 15, yText, { align: 'right' });
          yText += 22;
        }

        if (tot?.monto_usd != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Total Monto USD:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(11);
          doc.text(`$${safeNumber(tot.monto_usd).toFixed(2)}`, cardX + cardW - 15, yText, { align: 'right' });
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          yText += 22;
        }

        if (tot?.costo_usd != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Costo Total USD:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text(`$${safeNumber(tot.costo_usd).toFixed(2)}`, cardX + cardW - 15, yText, { align: 'right' });
          doc.setTextColor(71, 85, 105);
          yText += 22;
        }

        if (tot?.margen_usd != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Total Margen USD:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(16, 185, 129); // green color
          doc.text(`+$${safeNumber(tot.margen_usd).toFixed(2)}`, cardX + cardW - 15, yText, { align: 'right' });
          doc.setTextColor(71, 85, 105);
          yText += 22;
        }

        if (tot?.margen_porcentaje != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Margen Promedio:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.text(`${safeNumber(tot.margen_porcentaje).toFixed(1)}%`, cardX + cardW - 15, yText, { align: 'right' });
          yText += 22;
        }

        if (tot?.promedio_diario != null) {
          doc.setFont('Helvetica', 'normal');
          doc.text('Promedio Diario USD:', cardX + 15, yText);
          doc.setFont('Helvetica', 'bold');
          doc.text(`$${safeNumber(tot.promedio_diario).toFixed(2)}`, cardX + cardW - 15, yText, { align: 'right' });
          yText += 22;
        }
      }

      // Numeración de páginas en el pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('Generado por Sistema Baterías al Costo', 595.28 / 2, 815, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 595.28 - 50, 815, { align: 'right' });
      }

      const nombreTipo = { ventas: 'Ventas', ventas_bateria: 'Ventas_Bateria', ventas_varios: 'Ventas_Varios', compras: 'Compras', chatarra: 'Chatarra', inventario: 'Inventario' }[tipo] || tipo;
      const periodo = tipo === 'inventario' ? new Date().toISOString().split('T')[0] : `${desde}_a_${hasta}`;
      doc.save(`Reporte_${nombreTipo}_${periodo}.pdf`);
    } catch (e) {
      setError(e.response?.data?.mensaje || e.message);
    } finally {
      setCargando(false);
    }
  };

  return {
    tipo,
    setTipo,
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
  };
}
