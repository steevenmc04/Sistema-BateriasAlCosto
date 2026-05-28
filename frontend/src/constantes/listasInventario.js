export const MARCAS_BATERIA = Object.freeze([
  'Ecuador',
  'Bosch',
  'Acdelco',
  'Panasonic',
  'Volta',
  'Willard',
  'Century',
  'Motorcraft',
  'Optima',
  'Exide',
  'Otros',
]);

export const TIPOS_CAJA = Object.freeze([
  // Ecuador
  'Caja 42 FE 55 Amp',
  'Caja 34 FE 65 Amp',
  'Caja 27 FE 80 Amp',
  'Caja N40 FE 45 Amp',
  'Caja NS40 FE 42 Amp',
  'Caja 55 FE 62 Amp',
  'Caja F65 HP 95 Amp',
  'Caja N100 Super Heavy Duty 104 Amp',
  'Caja N150 Heavy Duty 140 Amp',
  'Caja N200 Super Heavy Duty 200 Amp',
  // Bosch
  'Caja 42 FE 45 Amp',
  'Caja 42 High Power 55 Amp',
  'Caja 55 Full Equipo 58 Amp',
  'Caja 34 FE 61 Amp',
  'Caja 34 HP 70 Amp',
  'Caja 27 HP 88 Amp',
  'Caja N40 FE 43 Amp',
  // Genéricos
  'Caja 22F',
  'Caja 24',
  'Caja 27F',
  'Caja 34',
  'Caja 35',
  'Caja 47',
  'Caja 48 (H6)',
  'Caja 49 (H8)',
  'Caja 65',
  'Caja 75',
  'Caja 78',
  'Otro',
]);

export const ES_OTRO_MARCA = (v) => v === 'Otros' || (v && !MARCAS_BATERIA.includes(v));
export const ES_OTRO_CAJA = (v) => v === 'Otro' || (v && !TIPOS_CAJA.includes(v));

export const CONDICIONES_BATERIA = Object.freeze([
  'Nueva',
  'Usada',
]);

export const PRECIOS_REFERENCIA = Object.freeze({
  'Ecuador-Caja 42 FE 55 Amp':           { costo: 49.50,  pvp_min: 57,   pvp_max: 68   },
  'Ecuador-Caja 34 FE 65 Amp':           { costo: 65.00,  pvp_min: 85,   pvp_max: 95   },
  'Ecuador-Caja 27 FE 80 Amp':           { costo: 92.50,  pvp_min: 110,  pvp_max: 125  },
  'Ecuador-Caja N40 FE 45 Amp':          { costo: 47.00,  pvp_min: 60,   pvp_max: 70   },
  'Ecuador-Caja NS40 FE 42 Amp':         { costo: 52.00,  pvp_min: 65,   pvp_max: 75   },
  'Ecuador-Caja 55 FE 62 Amp':           { costo: 74.00,  pvp_min: 90,   pvp_max: 100  },
  'Ecuador-Caja F65 HP 95 Amp':          { costo: 110.00, pvp_min: 130,  pvp_max: 145  },
  'Ecuador-Caja N150 Heavy Duty 140 Amp':{ costo: 184.69, pvp_min: 200,  pvp_max: 230  },
  'Bosch-Caja 42 FE 45 Amp':             { costo: 75.00,  pvp_min: 95,   pvp_max: 110  },
  'Bosch-Caja 42 High Power 55 Amp':     { costo: 80.00,  pvp_min: 100,  pvp_max: 115  },
  'Bosch-Caja 55 Full Equipo 58 Amp':    { costo: 102.00, pvp_min: 150,  pvp_max: 175  },
  'Bosch-Caja 34 FE 61 Amp':             { costo: 95.50,  pvp_min: 120,  pvp_max: 135  },
  'Bosch-Caja 34 HP 70 Amp':             { costo: 109.34, pvp_min: 135,  pvp_max: 150  },
  'Bosch-Caja 27 HP 88 Amp':             { costo: 74.00,  pvp_min: 95,   pvp_max: 110  },
});

export const CLAVES_PERMISO_UI = [
  { clave: 'inventario_ver', etiqueta: 'Ver Inventario' },
  { clave: 'inventario_crear', etiqueta: 'Crear Ítems' },
  { clave: 'inventario_editar', etiqueta: 'Editar Ítems' },
  { clave: 'inventario_eliminar', etiqueta: 'Eliminar Ítems' },
  { clave: 'ventas_baterias', etiqueta: 'Ventas Baterías' },
  { clave: 'compras_baterias', etiqueta: 'Compras Baterías' },
  { clave: 'operaciones_chatarra', etiqueta: 'Operaciones Chatarra' },
  { clave: 'historial_ventas_propias', etiqueta: 'Historial Ventas Propias' },
  { clave: 'historial_ventas_todos', etiqueta: 'Ver Todas Ventas' },
  { clave: 'reportes_ver', etiqueta: 'Ver Reportes' },
  { clave: 'reportes_pdf', etiqueta: 'Reportes PDF' },
  { clave: 'usuarios_ver', etiqueta: 'Ver Usuarios' },
  { clave: 'usuarios_editar', etiqueta: 'Editar Usuarios' },
  { clave: 'roles_admin', etiqueta: 'Admin Roles' },
  { clave: 'facturacion_ver', etiqueta: 'Ver Facturación' },
  { clave: 'facturacion_emitir', etiqueta: 'Emitir Facturas' },
  { clave: 'facturacion_anular', etiqueta: 'Anular Facturas' },
];

export const PRESET_VENDEDOR_UI = {
  inventario_ver: true,
  inventario_crear: false,
  inventario_editar: false,
  inventario_eliminar: false,
  ventas_baterias: true,
  compras_baterias: false,
  operaciones_chatarra: true,
  historial_ventas_propias: true,
  historial_ventas_todos: false,
  reportes_ver: true,
  reportes_pdf: false,
  usuarios_ver: false,
  usuarios_editar: false,
  roles_admin: false,
  facturacion_ver: true,
  facturacion_emitir: true,
  facturacion_anular: false,
};
