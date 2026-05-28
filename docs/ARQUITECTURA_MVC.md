# Arquitectura MVC del proyecto

## Objetivo

Este sistema se organiza bajo MVC para separar responsabilidades y reducir acoplamiento:

- **Modelo**: acceso a datos, consultas HTTP/SQL y reglas de persistencia.
- **Controlador**: orquesta flujos de negocio y estado de pantalla.
- **Vista**: renderizado de interfaz y eventos de usuario.

## Estructura por carpetas

### Frontend (`src/`)

- `modelos/`: consumo de API (`axios`) por módulo.
- `controladores/`: hooks que contienen estado y acciones de cada vista.
- `vistas/`: componentes React de presentación.
- `App.jsx`: layout principal y ruteo.
- `main.jsx`: punto de entrada de React.

### Backend (`servidor/`)

- `modelos/`: consultas MySQL y transacciones.
- `controladores/`: lógica HTTP (request/response).
- `rutas/`: definición de endpoints por módulo.
- `middleware/`: autenticación/autorización.
- `configuracion/`: conexión base de datos y parámetros.
- `index.js`: bootstrap de Express.

## Convenciones aplicadas

- Nombres funcionales en español en controladores/modelos.
- Un módulo por archivo para mantener responsabilidades simples.
- Comentarios JSDoc en funciones/métodos para explicar propósito y motivo.
- Rutas protegidas por token y rol donde aplica.

## Flujo general

1. Vista dispara evento de usuario.
2. Controlador (hook) valida y prepara payload.
3. Modelo de cliente consume endpoint backend.
4. Ruta backend dirige al controlador HTTP.
5. Controlador backend delega al modelo SQL.
6. Respuesta vuelve al cliente y la vista se actualiza.
