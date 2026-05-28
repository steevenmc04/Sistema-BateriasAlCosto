---
name: ui-premium-baterias
description: Skill premium para diseño UI/UX del Sistema Baterías al Costo usando React + Tailwind + SelectPremium.
---

# UI Premium — Sistema Baterías al Costo

## Objetivo

Aplicar una interfaz moderna, limpia, enterprise y responsive con paleta negro/dorado premium.

La skill debe mejorar:
- formularios
- modales
- tablas
- dropdowns
- layouts
- responsive
- spacing
- alineación visual
- UX de POS

SIN modificar lógica de negocio.

---

# REGLAS OBLIGATORIAS

## NO TOCAR

Prohibido modificar:
- backend
- endpoints
- hooks
- payloads
- validaciones
- auth
- cálculos
- lógica React
- lógica de stock

Solo modificar:
- JSX visual
- Tailwind
- CSS
- responsive
- layout
- spacing
- UI/UX

---

# PALETA OFICIAL

## Fondos

- bg-black
- bg-zinc-950
- bg-zinc-900

## Bordes

- border-border-default
- border-border-strong

## Textos

- text-text-primary
- text-text-muted
- text-zinc-300
- text-yellow-100

## Estados

- text-success
- text-warning
- text-error

## Focus

- focus:ring-yellow-500/20
- focus:border-yellow-400

---

# COMPONENTES OBLIGATORIOS

Usar SIEMPRE:

- card-premium
- input-premium
- table-premium
- modal-premium
- rounded-xl
- border-border-default

Nunca usar:
- estilos inline
- hexadecimales inline
- clases arbitrarias

---

# PROHIBIDO

NO usar:

- text-[#...]
- bg-[#...]
- border-[#...]
- rounded-[...]
- shadow-[...]
- estilos repetidos
- hacks visuales
- overrides globales temporales
- select nativo HTML

---

# DROPDOWNS

Todos los dropdowns deben:

- usar SelectPremium
- abrir hacia abajo
- tener z-50
- no romper layout
- no generar overflow horizontal
- tener scroll premium
- usar paleta negro/dorado
- soportar autocomplete
- soportar teclado

NO usar `<select>`.

---

# INPUTS

Todos los inputs deben:

- misma altura
- mismo padding
- mismo radio
- mismo borde
- mismo glow
- mismo font-size

Usar:
- h-12
- px-4
- rounded-xl
- input-premium

---

# FORMULARIOS POS

En:
- Nueva Venta
- Nueva Compra
- Nueva Chatarra

Aplicar:

## Layout

Desktop:
- grid-cols-6

Tablet:
- grid-cols-3

Mobile:
- grid-cols-1

Usar:
- gap-4
- items-end
- justify-start

---

# CAMPOS

Mantener:
- Marca
- Tipo Caja
- Código Manual
- Stock
- Cantidad
- Precio

## Código Manual

Debe ser más ancho:
- col-span-2
- min-w-[220px]

## Cantidad

No cortar números grandes.

Input debe crecer correctamente.

---

# STOCK

Mostrar stock como badge:

- verde = disponible
- amarillo = bajo
- rojo = sin stock

Nunca mostrar texto roto o guiones sueltos.

---

# MODALES

Los modales deben:

- estar centrados
- tener max-width correcta
- scroll elegante
- fondo uniforme
- NO tener cajas internas innecesarias

NO usar:
- cards pesadas dentro del modal
- múltiples bordes
- sombras exageradas

---

# RESPONSIVE

Obligatorio:

## Desktop
- layout horizontal limpio

## Tablet
- grid adaptable

## Mobile
- una columna
- botones full width
- dropdown usable
- sin overflow horizontal

---

# UX

## ESC
Debe cerrar modales.

## ENTER
Debe confirmar formularios válidos.

---

# BOTONES

Todos los botones:
- misma altura
- mismo radio
- mismo padding
- hover premium
- transiciones suaves

---

# TABLAS

Todas las tablas deben:
- usar table-premium
- sticky headers
- zebra rows
- responsive
- scroll elegante

---

# QA OBLIGATORIO

Después de cambios:

1. Ejecutar:

```bash
npm run build