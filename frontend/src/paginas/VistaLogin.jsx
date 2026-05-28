import { User, Lock, ArrowRight } from 'lucide-react';
import { useVistaLogin } from '../hooks/useVistaLogin.js';
import Button from '../componentes/Button.jsx';

const VistaLogin = ({ alLoguear }) => {
  const { nombreUsuario, setNombreUsuario, clave, setClave, error, cargando, manejarLogin } =
    useVistaLogin(alLoguear);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-500/5 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md relative">
        <div className="bg-zinc-900 border border-border-default rounded-xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
          
          <div className="flex flex-col items-center mb-8">
            <img 
              src={import.meta.env.BASE_URL + "logo.png"} 
              alt="Baterías Al Costo" 
              className="w-48 md:w-56 h-auto drop-shadow-lg" 
            />
          </div>

          {error && (
            <div className="bg-error/10 text-error p-4 rounded-xl text-center mb-6 border border-error/30 text-[10px] font-black uppercase tracking-widest animate-[slideDown_0.3s_ease-out]">
              {error}
            </div>
          )}

          <form onSubmit={manejarLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-text-muted text-[10px] font-black uppercase tracking-widest ml-1">ID de Acceso</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-yellow-100 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  className="input-premium pl-14"
                  placeholder="Usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-text-muted text-[10px] font-black uppercase tracking-widest ml-1">Clave de Seguridad</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-yellow-100 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  className="input-premium pl-14"
                  placeholder="••••••••"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={cargando} fullWidth loading={cargando} icon={<ArrowRight size={20} />}>
              Ingresar al Sistema
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[9px] text-text-muted/40 font-black uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} BATERÍAS AL COSTO</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VistaLogin;

