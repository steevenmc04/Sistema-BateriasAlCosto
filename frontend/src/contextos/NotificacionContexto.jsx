import { useState, useCallback, createContext, useContext, useEffect } from 'react';

const NOTIFICACION_EVENTO = '__notificar__';

export function notificarGlobal(mensaje, tipo = 'info', duracion = 4000) {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent(NOTIFICACION_EVENTO, { detail: { mensaje, tipo, duracion } }));
  }
}

const NotificacionContext = createContext(null);

export function NotificacionProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState([]);

  const agregar = useCallback((mensaje, tipo = 'info', duracion = 4000) => {
    const id = Date.now() + Math.random();
    setNotificaciones(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => setNotificaciones(prev => prev.filter(n => n.id !== id)), duracion);
  }, []);

  useEffect(() => {
    const handler = (e) => agregar(e.detail.mensaje, e.detail.tipo, e.detail.duracion);
    document.addEventListener(NOTIFICACION_EVENTO, handler);
    return () => document.removeEventListener(NOTIFICACION_EVENTO, handler);
  }, [agregar]);

  const eliminar = useCallback((id) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }, []);

  const exito = useCallback((msg, d) => agregar(msg, 'exito', d), [agregar]);
  const error = useCallback((msg, d) => agregar(msg, 'error', d), [agregar]);
  const advertencia = useCallback((msg, d) => agregar(msg, 'advertencia', d), [agregar]);
  const info = useCallback((msg, d) => agregar(msg, 'info', d), [agregar]);

  return (
    <NotificacionContext.Provider value={{ notificaciones, agregar, eliminar, exito, error, advertencia, info }}>
      {children}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notificaciones.map(n => (
          <div key={n.id} className={`pointer-events-auto animate-slide-up rounded-xl px-5 py-4 shadow-2xl border backdrop-blur-sm flex items-start gap-3 transition-all ${
            n.tipo === 'error' ? 'bg-error/10 border border-danger text-danger' :
            n.tipo === 'exito' ? 'bg-success/10 border border-success text-success' :
            n.tipo === 'advertencia' ? 'bg-warning/10 border border-warning text-warning' :
            'bg-surface-card border border-border-light text-text-secondary'
          }`}>
            <span className={`w-2 h-2 mt-1 rounded-full shrink-0 ${
              n.tipo === 'error' ? 'bg-danger' :
              n.tipo === 'exito' ? 'bg-success' :
              n.tipo === 'advertencia' ? 'bg-warning' :
              'bg-accent'
            }`} />
            <p className="text-[11px] font-bold leading-relaxed flex-1">{n.mensaje}</p>
            <button onClick={() => eliminar(n.id)} className="opacity-40 hover:opacity-100 transition-opacity shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>
    </NotificacionContext.Provider>
  );
}

export function useNotificacion() {
  const ctx = useContext(NotificacionContext);
  if (!ctx) throw new Error('useNotificacion debe usarse dentro de NotificacionProvider');
  return ctx;
}

