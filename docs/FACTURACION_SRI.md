# Facturación Electrónica al SRI

## Requisitos previos

1. **Certificado de firma electrónica** - Debe estar en formato .p12 o .pem
2. **RUC activo** - La empresa debe estar registrada en el SRI
3. **Ambiente** - Configurar `SRI_AMBIENTE=1` (pruebas) o `SRI_AMBIENTE=2` (producción)

## Configuración

Agregar al archivo `.env`:

```env
# SRI Facturación Electrónica
SRI_AMBIENTE=1  # 1 = Pruebas, 2 = Producción
SRI_CERTIFICADO_PATH=./certificados/certificado.p12
SRI_CERTIFICADO_PASSWORD=tu_password
```

## Estructura implementada

### Tablas nuevas en `facturas`:
- `clave_acceso` - Clave de acceso generada
- `numero_autorizacion` - Número de autorización del SRI
- `fecha_autorizacion` - Fecha cuando se autorizó
- `estado_sri` - pendiente, autorizado, rechazado
- `xml_firmado` - XML firmado guardado

### Endpoints disponibles:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/facturas` | Listar facturas (incluye estado SRI) |
| GET | `/api/facturas/:id` | Ver factura con detalles |
| POST | `/api/facturas` | Crear nueva factura |
| GET | `/api/facturas/:id/pdf` | Descargar PDF |
| GET | `/api/facturas/:id/xml` | Descargar XML |
| POST | `/api/facturas/:id/enviar-sri` | Enviar al SRI |
| GET | `/api/facturas/:id/autorizacion` | Consultar autorización |

## Flujo de facturación electrónica:

1. **Crear factura** - POST `/api/facturas`
2. **Generar XML** - GET `/api/facturas/:id/xml`
3. **Firmar digitalmente** - Con certificado .p12
4. **Enviar al SRI** - POST `/api/facturas/:id/enviar-sri`
5. **Consultar autorización** - GET `/api/facturas/:id/autorizacion`
6. **Descargar PDF con número de autorización** - GET `/api/facturas/:id/pdf`

## Archivos creados:

- `servidor/utilidades/sriClaveAcceso.js` - Generación de clave de acceso
- `servidor/utilidades/sriFacturaXML.js` - Generación de XML según formato SRI
- `servidor/utilidades/sriFirma.js` - Firma digital del XML
- `servidor/utilidades/sriServicios.js` - Conexión con webservices del SRI

## Notas importantes:

1. Las facturas se guardan con estado `estado_sri='pendiente'` al crearlas
2. Al enviar al SRI, se genera automáticamente la clave de acceso
3. La autorización es consultada de forma asíncrona (2 segundos después)
4. Para producción se requiere certificado conecta instalado