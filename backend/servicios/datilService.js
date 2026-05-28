import axios from 'axios'

const BASE_URL = 'https://app.datil.co/api/v2'

const clienteDatil = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Api-Key':    process.env.DATIL_API_KEY,
    'X-Account-Id': process.env.DATIL_ACCOUNT_ID,
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

/**
 * Emitir factura electrónica en el SRI via Datil
 * y enviar RIDE al correo del cliente
 */
export async function emitirFacturaDatil(factura) {

  // Determinar tipo de identificación del cliente
  const tipoId = determinarTipoId(factura.cliente_documento)

  // Construir payload para Datil
  const payload = {
    ambiente:       parseInt(process.env.DATIL_AMBIENTE || '1'),
    tipo_emision:   1,
    secuencia:      factura.numero_secuencial,
    fecha_emision:  formatearFecha(factura.fecha_emision),
    emisor: {
      ruc:              process.env.EMPRESA_RUC,
      razon_social:     process.env.EMPRESA_NOMBRE,
      nombre_comercial: process.env.EMPRESA_NOMBRE,
      direccion:        process.env.EMPRESA_DIRECCION,
      obligado_contabilidad: false,
      contribuyente_especial: ''
    },
    comprador: {
      razon_social:       factura.cliente_nombre,
      identificacion:     factura.cliente_documento || '9999999999999',
      tipo_identificacion: tipoId,
      email:              factura.cliente_email || '',
      telefono:           factura.cliente_telefono || '',
      direccion:          factura.cliente_direccion || ''
    },
    subtotal_sin_impuestos: Number(factura.base_imponible),
    subtotal_con_impuestos: Number(factura.total),
    descuento_adicional:    Number(factura.descuento || 0),
    total_sin_impuestos:    Number(factura.base_imponible),
    importe_total:          Number(factura.total),
    moneda:                 'USD',
    items:                  construirItems(factura.detalles,
                                          factura.iva_porcentaje),
    impuestos: [{
      codigo:             2,        // IVA
      codigo_porcentaje:  4,        // 15%
      base_imponible:     Number(factura.base_imponible),
      valor:              Number(factura.monto_iva),
      tarifa:             Number(factura.iva_porcentaje)
    }],
    pagos: [{
      medio:     'efectivo',
      total:     Number(factura.total),
      plazo:     0,
      unidad_tiempo: 'dias'
    }],
    version: '1.1.0'
  }

  // Enviar a Datil
  const { data } = await clienteDatil.post(
    '/invoices/issue', payload
  )

  return {
    numero_autorizacion: data.autorizacion?.numero,
    fecha_autorizacion:  data.autorizacion?.fecha,
    clave_acceso:        data.clave_acceso,
    estado:              data.estado,
    ride_url:            data.ride_url
  }
}

/**
 * Construir items del detalle para Datil
 */
function construirItems(detalles, ivaPorcentaje) {
  return detalles.map(item => {
    const subtotal   = Number(item.precio_unitario) *
                       Number(item.cantidad)
    const descuento  = Number(item.descuento || 0)
    const baseImpon  = subtotal - descuento
    const valorIva   = baseImpon * (Number(ivaPorcentaje) / 100)

    return {
      descripcion:          item.descripcion,
      codigo_principal:     item.codigo || 'SIN-CODIGO',
      cantidad:             Number(item.cantidad),
      precio_unitario:      Number(item.precio_unitario),
      descuento:            descuento,
      precio_total_sin_impuestos: baseImpon,
      impuestos: [{
        codigo:            2,
        codigo_porcentaje: 4,
        tarifa:            Number(ivaPorcentaje),
        base_imponible:    baseImpon,
        valor:             valorIva
      }]
    }
  })
}

/**
 * Determinar tipo de identificación según formato
 */
function determinarTipoId(identificacion) {
  if (!identificacion ||
      identificacion === '9999999999999') return '07' // consumidor final
  if (identificacion.length === 13)        return '04' // RUC
  if (identificacion.length === 10)        return '05' // cédula
  return '06' // pasaporte
}

/**
 * Formatear fecha para Datil: DD/MM/YYYY
 */
function formatearFecha(fecha) {
  const d = new Date(fecha)
  const dd   = String(d.getDate()).padStart(2, '0')
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
