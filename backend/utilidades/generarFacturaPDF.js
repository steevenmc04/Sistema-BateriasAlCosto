import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const fecha = (value) => new Date(value).toLocaleDateString('es-EC');

const textoSeguro = (value, fallback = 'N/A') => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  return String(value);
};

const desglosarDescripcion = (desc) => {
  let marca = '-';
  let caja = '-';
  let estado = '-';
  let codigo = '-';

  if (!desc) return { marca, caja, estado, codigo };

  const partes = desc.split(/\s*-\s*/);

  if (partes.length >= 4) {
    marca = partes[0].trim();
    caja = partes[1].trim();
    estado = partes[2].trim();
    codigo = partes[3].trim();
  } else if (partes.length === 3) {
    marca = partes[0].trim();
    caja = partes[1].trim();
    const ultimo = partes[2].trim();
    if (['Nueva', 'Usada', 'Nuevo', 'Usado'].includes(ultimo)) {
      estado = ultimo;
    } else {
      codigo = ultimo;
    }
  } else if (partes.length === 2) {
    marca = partes[0].trim();
    codigo = partes[1].trim();
  } else {
    marca = desc.trim();
  }

  if (codigo.startsWith('[') && codigo.endsWith(']')) {
    codigo = codigo.slice(1, -1);
  }

  return { marca, caja, estado, codigo };
};

/**
 * Genera un buffer PDF en formato ticket 80mm con alto variable.
 * @param {Object} factura Datos completos de la factura (incluye .detalles y .empresa)
 * @returns {Promise<Buffer>}
 */
export const generarFacturaPDF = (factura) => {
  return new Promise((resolve, reject) => {
    try {
      const empresa = factura.empresa || {};
      const items = factura.detalles || [];

      // ── Dimensiones ticket 80mm ──
      const W = 227; // 80mm ≈ 227pt
      const PM = 10;
      const CX = PM;
      const CW = W - PM * 2;
      const col = [0, 20, 58, 136, 178]; // x-offsets from CX (gaps de 4pt entre columnas)
      const colW = [16, 28, 78, 40, 29]; // column widths (sum = 191 + 16 gaps = 207)
      const LH = 15; // item row height base

      // ── Estimar altura total (asume hasta 2 lineas por item) ──
      const hNotas = factura.notas ? 22 : 0;
      const totalH = 320 + items.length * LH * 2 + hNotas + 20;

      const doc = new PDFDocument({ margin: PM, size: [W, totalH],
        info: { Title: `Factura ${factura.numero_factura || ''}` } });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.rect(0, 0, W, totalH).fillColor('#ffffff').fill();

      const cx = CX;
      const cw = CW;
      const sep = (y) => { doc.moveTo(cx, y).lineTo(cx + cw, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke(); };

      let y = 10;

      // ── HEADER ──
      const logo = [path.join(__dirname, '..', '..', 'frontend', 'public', 'logoParaFactura.png'),
                    path.join(__dirname, '..', '..', 'frontend', 'public', 'logo.png')]
        .find((f) => fs.existsSync(f));
      if (logo) {
        doc.image(logo, cx + cw / 2 - 55, y, { fit: [110, 32], align: 'center', valign: 'center' });
        y += 38;
      } else {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b1220')
          .text('BATERIAS AL COSTO', cx, y, { width: cw, align: 'center' });
        y += 16;
      }

      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`RUC: ${textoSeguro(empresa.ruc, '-')}`, cx, y, { width: cw, align: 'center' });
      y += 12;
      doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text(textoSeguro(empresa.direccion, '-'), cx, y, { width: cw, align: 'center' });
      y += 11;
      doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text(`Tel: ${textoSeguro(empresa.telefono, '-')}${empresa.email ? ` | ${empresa.email}` : ''}`, cx, y, { width: cw, align: 'center' });
      y += 11;

      sep(y);
      y += 7;

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f2937')
        .text('FACTURA DE VENTA', cx, y, { width: cw, align: 'center' });
      y += 13;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0b1220')
        .text(`#${textoSeguro(factura.numero_factura, 'SIN NUMERO')}`, cx, y, { width: cw, align: 'center' });
      y += 14;

      const mw = cw / 2;
      doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text(`Fecha: ${fecha(factura.fecha_emision)}`, cx, y, { width: mw })
        .text(`Estado: ${textoSeguro(factura.estado, 'emitida')}`, cx + mw, y, { width: mw, align: 'right' });
      y += 13;

      // ── CLIENTE ──
      sep(y);
      y += 7;

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1f2937')
        .text(textoSeguro(factura.cliente_nombre, 'CONSUMIDOR FINAL'), cx, y, { width: cw });
      y += 12;
      doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text(`Documento: ${textoSeguro(factura.cliente_documento, '9999999999999')}`, cx, y, { width: mw });
      if (factura.cliente_telefono) {
        doc.font('Helvetica').fontSize(7).fillColor('#64748b')
          .text(`Tel: ${factura.cliente_telefono}`, cx + mw, y, { width: mw, align: 'right' });
      }
      y += 11;
      if (factura.cliente_direccion) {
        doc.font('Helvetica').fontSize(7).fillColor('#64748b')
          .text(`Dir: ${factura.cliente_direccion}`, cx, y, { width: cw });
        y += 11;
      }

      sep(y);
      y += 6;

      // ── TABLE HEADER ──
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748b');
      doc.text('Cant', cx + col[0], y, { width: colW[0], align: 'right' });
      doc.text('P.Unit', cx + col[1], y, { width: colW[1], align: 'right' });
      doc.text('Descripcion', cx + col[2], y, { width: colW[2] });
      doc.text('Codigo', cx + col[3], y, { width: colW[3] });
      doc.text('Total', cx + col[4], y, { width: colW[4], align: 'right' });
      y += 11;
      doc.moveTo(cx, y).lineTo(cx + cw, y).strokeColor('#e5e7eb').lineWidth(0.3).stroke();
      y += 4;

      // ── ITEMS ──
      doc.font('Helvetica').fontSize(7).fillColor('#1f2937');
      items.forEach((item) => {
        const p = desglosarDescripcion(item.descripcion);
        const desc = [p.marca, p.caja, p.estado === 'Nueva' ? 'N' : p.estado === 'Usada' ? 'U' : p.estado].filter(Boolean).join(' ');

        const descH = doc.heightOfString(desc, { width: colW[2] });
        const rowH = Math.max(LH, descH + 4);

        doc.text(String(item.cantidad), cx + col[0], y, { width: colW[0], align: 'right' });
        doc.text(money(item.precio_unitario), cx + col[1], y, { width: colW[1], align: 'right' });
        doc.text(desc, cx + col[2], y, { width: colW[2] });
        doc.text(p.codigo, cx + col[3], y, { width: colW[3], ellipsis: true });
        doc.font('Helvetica-Bold').text(money(item.subtotal), cx + col[4], y, { width: colW[4], align: 'right' });
        doc.font('Helvetica');
        y += rowH;
      });

      // ── NOTAS ──
      if (factura.notas) {
        sep(y);
        y += 6;
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#64748b')
          .text(`Notas: ${textoSeguro(factura.notas, '')}`, cx, y, { width: cw });
        y += 16;
      }

      // ── TOTALES ──
      sep(y);
      y += 7;

      const ft = (label, val, bold) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 7.5)
          .fillColor(bold ? '#0b1220' : '#1f2937')
          .text(label, cx, y, { width: 100 });
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 7.5)
          .fillColor('#0b1220')
          .text(money(val), cx + 100, y, { width: cw - 100, align: 'right' });
        y += bold ? 16 : 13;
      };

      ft('Subtotal', factura.subtotal);
      ft('Descuento', factura.descuento);
      ft('Subtotal neto', factura.base_imponible);
      ft(`IVA (${Number(factura.iva_porcentaje || 0).toFixed(0)}%)`, factura.monto_iva);

      doc.moveTo(cx, y).lineTo(cx + cw, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
      y += 8;

      ft('TOTAL', factura.total, true);

      // ── FOOTER ──
      y += 4;
      sep(y);
      y += 7;
      doc.font('Helvetica').fontSize(6).fillColor('#94a3b8')
        .text('Documento generado por Baterias al Costo', cx, y, { width: cw, align: 'center' });
      y += 9;
    
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
