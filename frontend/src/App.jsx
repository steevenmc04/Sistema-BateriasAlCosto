import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ShoppingCart, Package, History, LogOut, ShieldCheck, Users, ChevronLeft, ChevronRight, Menu, FileText } from 'lucide-react';

import { useSesion } from './hooks/useSesion.js';
import { NotificacionProvider } from './contextos/NotificacionContexto.jsx';
import VistaLogin from './paginas/VistaLogin.jsx';
import VistaProductos from './paginas/VistaProductos.jsx';
import VistaTransacciones from './paginas/VistaTransacciones.jsx';
import VistaUsuarios from './paginas/VistaUsuarios.jsx';
import VistaRoles from './paginas/VistaRoles.jsx';
import VistaReportes from './paginas/VistaReportes.jsx';
import VistaFacturas from './paginas/VistaFacturas.jsx';
import { tienePermiso, usuarioTieneAlgunModulo } from './utilidades/permisosCliente.js';

function rutaInicialPorPermisos(usuario) {
  if (!usuarioTieneAlgunModulo(usuario)) return '/bloqueado';
  if (tienePermiso(usuario, 'inventario_ver')) return '/inventario';
  if (
    tienePermiso(usuario, 'ventas_baterias') ||
    tienePermiso(usuario, 'compras_baterias') ||
    tienePermiso(usuario, 'operaciones_chatarra')
  ) {
    return '/ventas';
  }
  if (tienePermiso(usuario, 'reportes_ver')) return '/reportes';
  if (tienePermiso(usuario, 'usuarios_ver')) return '/usuarios';
  if (tienePermiso(usuario, 'roles_admin')) return '/roles';
  return '/bloqueado';
}

function PaginaSinModulos() {
  return (
    <div className="flex h-full flex-col justify-center px-16 text-sm gap-4 max-w-lg">
      <p className="font-black text-white uppercase italic text-xl">Acceso Restringido</p>
      <p className="text-text-muted">
        Tu usuario no tiene ningún módulo habilitado. Solicita a un administrador que revise tu perfil en <span className="text-text-muted font-bold">Roles y permisos</span>.
      </p>
    </div>
  );
}

function RedirigeSegunPermisos({ usuario }) {
  const destino = rutaInicialPorPermisos(usuario);
  if (destino === '/bloqueado') return <PaginaSinModulos />;
  return <Navigate to={destino} replace />;
}

const OpcionMenu = ({ to, icono: Icono, etiqueta, activo, colapsado }) => (
  <Link
    to={to}
    title={colapsado ? etiqueta : ""}
    className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
      activo 
        ? 'bg-brand-500/10 text-yellow-100 border border-yellow-100/20 shadow-glow-sm' 
        : 'text-text-muted hover:bg-zinc-900/80 hover:text-white'
    } ${colapsado ? 'justify-center px-0' : ''}`}
  >
    <div className={`transition-transform duration-300 shrink-0 ${activo ? 'scale-110' : 'group-hover:scale-110'}`}>
      <Icono size={20} strokeWidth={activo ? 2.5 : 2} />
    </div>
    {!colapsado && (
      <>
        <span className={`text-[11px] font-black tracking-widest uppercase whitespace-nowrap ${activo ? 'text-white' : ''}`}>
          {etiqueta}
        </span>
        {activo && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-glow-sm" />}
      </>
    )}
  </Link>
);

function ContenidoMenu({ usuario, colapsado }) {
  const ubicacion = useLocation();
  const opciones = [];

  if (tienePermiso(usuario, 'inventario_ver')) {
    opciones.push({ clave: 'inv', to: '/inventario', icono: Package, etiqueta: 'Inventario', rutasActivas: ['/inventario'] });
  }
  if (tienePermiso(usuario, 'ventas_baterias') || tienePermiso(usuario, 'compras_baterias') || tienePermiso(usuario, 'operaciones_chatarra')) {
    opciones.push({ clave: 'ops', to: '/ventas', icono: ShoppingCart, etiqueta: 'Ventas y compras', rutasActivas: ['/ventas', '/compras'] });
  }
  if (tienePermiso(usuario, 'facturacion_ver')) {
    opciones.push({ clave: 'fac', to: '/facturacion', icono: FileText, etiqueta: 'Facturación', rutasActivas: ['/facturacion'] });
  }
  if (tienePermiso(usuario, 'reportes_ver')) {
    opciones.push({ clave: 'rep', to: '/reportes', icono: History, etiqueta: 'Reportes', rutasActivas: ['/reportes'] });
  }
  if (tienePermiso(usuario, 'usuarios_ver')) {
    opciones.push({ clave: 'usr', to: '/usuarios', icono: Users, etiqueta: 'Usuarios', rutasActivas: ['/usuarios'] });
  }
  if (tienePermiso(usuario, 'roles_admin')) {
    opciones.push({ clave: 'rol', to: '/roles', icono: ShieldCheck, etiqueta: 'Roles y permisos', rutasActivas: ['/roles'] });
  }

  return (
    <div className="space-y-1">
      {opciones.map((opcion) => (
        <OpcionMenu key={opcion.clave} to={opcion.to} icono={opcion.icono} etiqueta={opcion.etiqueta} activo={opcion.rutasActivas.includes(ubicacion.pathname)} colapsado={colapsado} />
      ))}
      {opciones.length === 0 && (
        <div className="text-xs text-error p-6 border border-border-default rounded-xl leading-relaxed">
          Sin módulos en este perfil.
        </div>
      )}
    </div>
  );
}

function App() {
  const { usuario, setUsuario, cargando, cerrarSesion } = useSesion();
  const [colapsado, setColapsado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuAbierto(false), [location.pathname]);
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (cargando) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-black uppercase tracking-widest text-[10px]">
        <div className="loader-gold" />
        Sincronizando Sistema...
      </div>
    );
  }

  if (!usuario) return <NotificacionProvider><VistaLogin alLoguear={setUsuario} /></NotificacionProvider>;

  return (
    <NotificacionProvider>
    <div className="flex h-screen bg-black text-text-muted overflow-hidden w-full font-sans relative">
      
        <button 
          onClick={() => setMenuAbierto(true)}
          className="md:hidden fixed top-6 left-6 z-[60] w-12 h-12 rounded-xl bg-zinc-900 border border-border-light flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all"
        >
        <Menu size={24} />
      </button>

      {menuAbierto && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] animate-[fadeIn_0.3s_ease-out]"
          onClick={() => setMenuAbierto(false)}
        />
      )}

        <aside className={`
          fixed inset-y-0 left-0 z-[80] transition-all duration-500 ease-in-out
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:relative
          ${colapsado ? 'md:w-24' : 'md:w-72'} 
          w-[280px] max-w-[75%] md:max-w-none
          bg-zinc-900 border-r border-border-default flex flex-col py-8 px-6
        `}>
        
        <button 
          onClick={() => setColapsado(!colapsado)}
          className="hidden md:flex absolute -right-4 top-10 w-8 h-8 rounded-full bg-black border border-border-default items-center justify-center text-text-muted hover:text-text-primary hover:border-border-strong hover:bg-yellow-500/10 transition-all z-50"
          >
          {colapsado ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`flex items-center gap-3 mb-8 relative ${colapsado ? 'md:justify-center' : ''}`}>
          <img 
            src={import.meta.env.BASE_URL + "logo.png"} 
            alt="Logo" 
            className={`${colapsado ? 'w-12' : 'w-40'} h-auto transition-all duration-500`} 
          />
        </div>

        <nav className="flex-1 relative overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <ContenidoMenu usuario={usuario} colapsado={colapsado} />
        </nav>

          <div className="mt-auto relative pt-8 border-t border-border-default">
          <div className={`flex items-center gap-3 mb-6 ${colapsado ? 'md:justify-center' : ''}`}>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-500 flex items-center justify-center font-black text-black text-sm">
              {usuario.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : '??'}
            </div>
            <div className={`flex-1 min-w-0 whitespace-nowrap animate-[fadeIn_0.5s_ease-out] duration-500 ${colapsado ? 'md:hidden' : ''}`}>
              <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{usuario.nombre}</p>
              <p className="text-[9px] text-yellow-100 font-bold uppercase tracking-widest">{usuario.rol}</p>
            </div>
          </div>
           <button
            type="button"
            onClick={cerrarSesion}
            title={colapsado ? "Salir del Sistema" : ""}
            className={`w-full flex items-center justify-center gap-3 p-4 text-text-muted font-bold hover:text-text-primary hover:bg-zinc-900/80 rounded-xl transition-all duration-300 text-[10px] uppercase tracking-widest border border-border-default ${colapsado ? 'md:px-0' : ''}`}
          >
            <LogOut size={16} /> 
            <span className={`whitespace-nowrap animate-[fadeIn_0.5s_ease-out] duration-500 ${colapsado ? 'md:hidden' : ''}`}>Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 lg:p-12 bg-black w-full min-w-0">
        <Routes>
          <Route path="/" element={<RedirigeSegunPermisos usuario={usuario} />} />
          <Route path="/inventario" element={<VistaProductos usuario={usuario} />} />
          <Route path="/ventas" element={<VistaTransacciones usuario={usuario} tabPredeterminado="venta" />} />
          <Route path="/compras" element={<VistaTransacciones usuario={usuario} tabPredeterminado="compra" />} />
          <Route path="/reportes" element={<VistaReportes usuario={usuario} />} />
          <Route path="/usuarios" element={<VistaUsuarios usuario={usuario} />} />
          <Route path="/roles" element={<VistaRoles usuario={usuario} />} />
          <Route path="/facturacion" element={<VistaFacturas usuario={usuario} />} />
          <Route path="/bloqueado" element={<PaginaSinModulos />} />
          <Route path="*" element={<RedirigeSegunPermisos usuario={usuario} />} />
        </Routes>
      </main>
    </div>
    </NotificacionProvider>
  );
}

export default App;

