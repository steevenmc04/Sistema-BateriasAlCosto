import { useState, useMemo, useEffect } from 'react';

/**
 * @hook usePaginacion
 * @description Hook personalizado de React para gestionar la paginación local de un conjunto de elementos.
 * Proporciona el estado de la página actual, la cantidad de elementos por página, y calcula dinámicamente
 * los elementos correspondientes a la vista activa, controlando desbordamientos tras filtrados o cambios de tamaño.
 * 
 * @param {Array} items - Arreglo con la totalidad de los elementos a paginar.
 * @param {number} [tamañoInicial=10] - Cantidad inicial de elementos que se mostrarán por página.
 * 
 * @returns {Object} Un objeto que contiene el estado y las funciones de control de la paginación:
 *   - {number} paginaActual: Índice de la página que se visualiza actualmente (comienza en 1).
 *   - {Function} setPaginaActual: Función para actualizar el índice de la página actual.
 *   - {number} elementosPorPagina: Cantidad de elementos configurados para mostrarse por página (0 representa "Todos").
 *   - {Function} setElementosPorPagina: Función para cambiar la cantidad de elementos que se muestran por página.
 *   - {number} totalPaginas: Cantidad calculada de páginas disponibles en total (mínimo 1).
 *   - {Array} itemsPaginados: Subconjunto de elementos de la lista original correspondientes a la página activa.
 *   - {number} totalElementos: La cantidad total de elementos recibidos originalmente.
 */
export function usePaginacion(items, tamañoInicial = 10) {
  /**
   * @state paginaActual
   * @description Estado que almacena el índice numérico de la página activa de la paginación.
   */
  const [paginaActual, setPaginaActual] = useState(1);

  /**
   * @state elementosPorPagina
   * @description Estado que define el tamaño del lote de elementos visibles por página.
   */
  const [elementosPorPagina, setElementosPorPagina] = useState(tamañoInicial);

  /**
   * @variable totalElementos
   * @description Cantidad total de elementos del arreglo de entrada.
   */
  const totalElementos = items.length;

  /**
   * @variable totalPaginas
   * @description Cantidad total de páginas calculadas a partir del total de elementos y del límite de elementos por página.
   */
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / elementosPorPagina));

  /**
   * @effect Ajustar página actual
   * @description Corrige y ajusta la página actual si esta excede el total de páginas calculadas (por ejemplo, tras aplicar filtros en la lista).
   */
  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  /**
   * @memo itemsPaginados
   * @description Memoriza el subconjunto de elementos de la lista correspondiente al rango de la página actual.
   * Si 'elementosPorPagina' se define en 0, se omitirá el recorte y se retornará la lista completa.
   */
  const itemsPaginados = useMemo(() => {
    // Si la página segura es 0, mostramos todo (opcional para 'Todos')
    if (elementosPorPagina === 0) return items;

    const inicio = (paginaActual - 1) * elementosPorPagina;
    const fin = inicio + elementosPorPagina;
    return items.slice(inicio, fin);
  }, [items, paginaActual, elementosPorPagina]);

  return {
    paginaActual,
    setPaginaActual,
    elementosPorPagina,
    setElementosPorPagina,
    totalPaginas,
    itemsPaginados,
    totalElementos
  };
}

