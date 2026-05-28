import { ShieldCheck, Save, UserPlus, CheckCircle, Shield } from 'lucide-react';
import { useVistaRoles } from '../hooks/useVistaRoles.js';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Paginacion from '../componentes/Paginacion.jsx';
import Button from '../componentes/Button.jsx';
import PageTitle from '../componentes/PageTitle.jsx';
import { PRESET_VENDEDOR_UI } from '../constantes/listasInventario.js';
import { tienePermiso } from '../utilidades/permisosCliente.js';

const VistaRoles = ({ usuario }) => {
  const { roles, cargando, mensaje, formulario, setFormulario, plantillaClaves, togglePermiso,
    nuevaPlantilla, cargarPresetVendedor, editarRol, guardar, eliminarRol } = useVistaRoles();
  const { paginaActual, setPaginaActual, elementosPorPagina, setElementosPorPagina, totalPaginas, itemsPaginados, totalElementos } = usePaginacion(roles, 10);

  if (!tienePermiso(usuario, 'roles_admin')) {
    return <div className="p-16 text-center font-black uppercase tracking-[0.3em] text-error text-xs">No tienes permisos para acceder a esta sección.</div>;
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <PageTitle
        eyebrow="Roles · Permisos"
        titleWhite="Gestión de"
        titleGold="Roles"
        subtitle="Define permisos y controla accesos por perfil."
      />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
         <form onSubmit={guardar} className="space-y-6 border-t border-border-default pt-6">
          <div className="flex items-center gap-3">
            <div className="text-accent"><UserPlus /></div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase">{formulario.id ? 'Actualizar rol' : 'Nuevo rol'}</h2>
              <button type="button" className="text-[10px] font-black uppercase text-text-muted mt-2 hover:text-text-zinc-300 transition-colors" onClick={nuevaPlantilla}>Limpiar editor</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Nombre del Rol</label>
            <input required className="input-premium" value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Descripción</label>
            <textarea rows={2} className="input-premium !h-auto min-h-[100px] resize-none pt-3"
              value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="px-4 py-2 rounded-xl bg-black border border-border-default text-[10px] font-black uppercase tracking-[0.2em] text-accent hover:bg-yellow-500/10 transition-colors"
              onClick={() => cargarPresetVendedor(PRESET_VENDEDOR_UI)}>Plantilla vendedor</button>
          </div>

          <div>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] mb-4">Permisos disponibles</p>
            <div className="space-y-2 max-h-[440px] overflow-y-auto custom-scrollbar pr-2">
              {plantillaClaves.map((perm) => (
                <label key={perm.clave} className="flex items-center gap-4 py-3 border-b border-border-default/60 cursor-pointer hover:text-text-primary transition-colors">
                  <input type="checkbox" className="accent-accent w-4 h-4 rounded"
                    checked={Boolean(formulario.permisos?.[perm.clave])}
                    onChange={(e) => togglePermiso(perm.clave, e.target.checked)} />
                  <span>
                    <span className="block text-[12px] font-black text-white uppercase tracking-tight">{perm.etiqueta}</span>
                    <span className="text-[9px] text-text-muted font-mono tracking-widest">{perm.clave}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth icon={<Save size={18} />}>Guardar rol</Button>

          {mensaje && (
            <div className="flex items-center gap-2 text-success text-[11px] font-black uppercase tracking-[0.3em]">
              <CheckCircle size={18} /> {mensaje}
            </div>
          )}
        </form>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-yellow-100" size={20} />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted">Roles configurados</h3>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center py-24 gap-4 text-[10px] font-black uppercase text-text-muted tracking-[0.4em]">
              <div className="loader-gold" />
              Cargando roles...
            </div>
          ) : (
            <div className="grid gap-4">
              {itemsPaginados.map((rol) => {
                const permisosActivos = Object.entries(rol.permisos || {}).filter(([, val]) => val === true).map(([clave]) => clave);
                return (
                  <div key={rol.id} className="card-premium space-y-5 relative overflow-hidden">
                    <div className="flex justify-between gap-6">
                      <div className="min-w-0">
                        <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                          <Shield size={12} className="text-yellow-100" />
                          Rol #{rol.id}
                        </p>
                        <h4 className="text-xl md:text-2xl font-black italic text-white uppercase truncate">{rol.nombre}</h4>
                        {rol.descripcion && <p className="text-text-muted text-[10px] md:text-[11px] font-medium mt-2 leading-relaxed">{rol.descripcion}</p>}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button type="button" onClick={() => editarRol(rol)} className="px-3 py-2 text-[12px] font-black uppercase tracking-wide rounded-xl bg-black border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 transition-all shadow-glow-sm">Cargar en editor</button>
                        {rol.id !== 1 && (
                          <button type="button" className="px-5 py-2 rounded-xl bg-error/10 border border-error/30 text-[10px] font-black uppercase text-error hover:brightness-110 transition-all"
                            onClick={() => eliminarRol(rol.id)}>Eliminar</button>
                        )}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border-default">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-muted mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse inline-block" />
                        {permisosActivos.length} permisos activos
                      </p>
                      {permisosActivos.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {permisosActivos.map((clave) => {
                            const def = plantillaClaves.find(p => p.clave === clave);
                            return (
                              <span key={clave} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 border border-yellow-100/20 text-yellow-100 text-[9px] font-black uppercase tracking-wide">
                                <span className="w-1 h-1 bg-brand-500 rounded-full shrink-0" />
                                {def?.etiqueta || clave}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-text-muted italic">Sin permisos asignados</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!cargando && (
            <div className="border-t border-border-default pt-4">
              <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos}
                elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VistaRoles;

