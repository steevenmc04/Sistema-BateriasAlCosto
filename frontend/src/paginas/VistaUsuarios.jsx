import { useEffect } from 'react';
import { Users, UserPlus, X, Save, ShieldCheck } from 'lucide-react';
import { useVistaUsuarios } from '../hooks/useVistaUsuarios.js';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Paginacion from '../componentes/Paginacion.jsx';
import Button from '../componentes/Button.jsx';
import SelectPremium from '../componentes/SelectPremium.jsx';
import PageTitle from '../componentes/PageTitle.jsx';
import { tienePermiso } from '../utilidades/permisosCliente.js';

const VistaUsuarios = ({ usuario }) => {
  const { usuarios, roles, mostrarModal, setMostrarModal, nuevoUsuario, setNuevoUsuario, manejarGuardar, cambiarRol } = useVistaUsuarios();
  const { paginaActual, setPaginaActual, elementosPorPagina, setElementosPorPagina, totalPaginas, itemsPaginados, totalElementos } = usePaginacion(usuarios, 10);

  const puedeVer = tienePermiso(usuario, 'usuarios_ver');
  const puedeEditar = tienePermiso(usuario, 'usuarios_editar');

  useEffect(() => {
    if (!mostrarModal) return undefined;
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-select-premium-open="true"]')) return;
      setMostrarModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mostrarModal, setMostrarModal]);

  if (!puedeVer) {
    return <div className="p-16 text-center font-black uppercase tracking-[0.3em] text-error text-xs">No tienes permisos para acceder a esta sección.</div>;
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="page-header">
        <PageTitle
          eyebrow="Personal y Seguridad"
          titleWhite="Gestión de"
          titleGold="Usuarios"
          subtitle="Administra cuentas, roles y estado operativo del equipo."
        />
        {puedeEditar && <Button onClick={() => setMostrarModal(true)} icon={<UserPlus size={18} />}>Provisionar usuario</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {itemsPaginados.map((u) => (
          <div key={u.id} className="card-premium group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={80} className="text-yellow-100" />
            </div>
            <div className="flex items-center gap-5 mb-6 relative">
              <div className="w-16 h-16 bg-zinc-950 border border-border-default rounded-xl flex items-center justify-center font-black text-2xl text-yellow-100 group-hover:scale-105 transition-transform duration-500">
                {u.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter italic leading-none">{u.nombre}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <ShieldCheck size={12} className="text-yellow-100" />
                  <p className="text-yellow-100 text-[9px] font-black tracking-[0.3em] uppercase">{u.rol_nombre}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 relative">
              <div className="flex justify-between items-center text-sm border-b border-border-default pb-4">
                <span className="text-text-muted font-black uppercase text-[9px] tracking-widest">Nombre de Usuario</span>
                <span className="text-text-primary font-mono text-xs font-bold tracking-tight">{u.nombre_usuario}</span>
              </div>
              {puedeEditar && (
                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em]">Actualizar rol</label>
                  <SelectPremium
                    options={roles.map(r => ({ value: r.id, label: r.nombre }))}
                    value={u.rol_id}
                    onChange={(e) => cambiarRol(u.id, e.target.value)}
                    placeholder="Seleccione un rol"
                    className="w-full"
                  />
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted font-black uppercase text-[9px] tracking-widest">Estado del Nodo</span>
                <span className={`font-black text-[10px] uppercase flex items-center gap-2 ${u.estado === 'activo' ? 'text-success' : 'text-error'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${u.estado === 'activo' ? 'bg-success' : 'bg-error'}`} />
                  {u.estado}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border-default pt-4">
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos}
          elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />
      </div>

      {mostrarModal && puedeEditar && (
        <div className="modal-backdrop">
          <div className="modal-premium w-full md:max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-100" />
            <div className="modal-header">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-text-primary uppercase italic tracking-tighter">Provisión de <span className="text-yellow-100">Agente</span></h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">Generación de credenciales</p>
              </div>
              <button type="button" onClick={() => setMostrarModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-zinc-900/80 transition-all"><X size={20} /></button>
            </div>
            <div className="modal-body overflow-visible">
              <form onSubmit={manejarGuardar} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Nombre Completo</label>
                  <input type="text" required className="input-premium" placeholder="Nombre del operador"
                    value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">ID de Acceso</label>
                    <input type="text" required className="input-premium" placeholder="Usuario"
                      value={nuevoUsuario.nombre_usuario} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre_usuario: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Clave de Red</label>
                    <input type="password" required className="input-premium" placeholder="••••••••"
                      value={nuevoUsuario.clave} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, clave: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Nivel de Autorización</label>
                  <SelectPremium
                    options={[{ value: '', label: 'Seleccione un nivel' }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]}
                    value={nuevoUsuario.rol_id}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol_id: e.target.value })}
                    placeholder="Seleccione un nivel"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="secondary" type="button" onClick={() => setMostrarModal(false)} fullWidth>Cancelar</Button>
                  <Button type="submit" fullWidth icon={<Save size={18} />}>Autorizar Agente</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaUsuarios;
