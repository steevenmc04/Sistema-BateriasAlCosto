import { useState, useEffect, useRef, useCallback } from 'react';
import apiCliente, { API } from '../servicios/servicios.js';

export default function useAutocompleteCliente({ onSelect } = {}) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const buscar = useCallback(async (q) => {
    if (!q || q.length < 1) { setResultados([]); return; }
    setCargando(true);
    try {
      const res = await apiCliente.get(`${API}/api/clientes/buscar`, {
        params: { q, limite: 10 }
      });
      const data = res.data;
      setResultados(Array.isArray(data) ? data : data?.data || []);
      setAbierto(true);
    } catch { setResultados([]); } finally { setCargando(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (seleccionado) return;
    timerRef.current = setTimeout(() => buscar(busqueda), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [busqueda, buscar, seleccionado]);

  const seleccionar = (cliente) => {
    setSeleccionado(cliente);
    setBusqueda(cliente.nombre);
    setResultados([]);
    setAbierto(false);
    setIndiceActivo(-1);
    if (onSelect) onSelect(cliente);
  };

  const limpiar = () => {
    setSeleccionado(null);
    setBusqueda('');
    setResultados([]);
    setAbierto(false);
    setIndiceActivo(-1);
  };

  const handleKeyDown = (e) => {
    if (!abierto || resultados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo(prev => Math.min(prev + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      seleccionar(resultados[indiceActivo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
      setIndiceActivo(-1);
    }
  };

  return {
    busqueda, setBusqueda, resultados, cargando, abierto, setAbierto,
    seleccionado, setSeleccionado, indiceActivo, inputRef,
    seleccionar, limpiar, handleKeyDown,
  };
}
