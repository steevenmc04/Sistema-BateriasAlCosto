import { useEffect, useMemo } from 'react';
import Badge from '../componentes/Badge.jsx';
import { Plus, Search, X, Save, Trash2 } from 'lucide-react';
import { useVistaProductos } from '../hooks/useVistaProductos.js';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Paginacion from '../componentes/Paginacion.jsx';
import Button from '../componentes/Button.jsx';
import { safeNumber } from '../utilidades/safeNumber.js';
import Autocomplete from '../componentes/Autocomplete.jsx';
import SelectPremium from '../componentes/SelectPremium.jsx';
import TablePremium from '../componentes/TablePremium.jsx';
import { tienePermiso } from '../utilidades/permisosCliente.js';
import PageTitle from '../componentes/PageTitle.jsx';

const VistaProductos = ({ usuario }) => {
  const {
    tab, setTab, cargando, busqueda, setBusqueda, bFiltradas, vFiltradas,
    proxVar, formBat, setFormBat, formVar, setFormVar, modalBat, modalVar,
    abrirNuevaBateria, abrirEditarBateria, guardarBateria, eliminarBateriaFn,
    abrirNuevoVario, abrirEditVario, guardarVario, eliminarVarFn, errorMsg,
    editBatEsNuevo, filtroStock, setFiltroStock, setModalBat, setModalVar,
    marcasDB, tiposCajaDB, baterias,
  } = useVistaProductos();

  const condicionesLista = useMemo(() => ['Nueva', 'Usada'], []);
  const marcasLista = useMemo(() => [...marcasDB, 'Otros'].sort((a,b) => a.localeCompare(b)), [marcasDB]);
  const tiposCajaLista = useMemo(() => [...tiposCajaDB, 'Otro'].sort((a,b) => a.localeCompare(b)), [tiposCajaDB]);

  const tiposCajaProducto = useMemo(() => {
    if (!formBat.marca) return tiposCajaLista;
    const filtrados = [...new Set(
      baterias
        .filter(i => i.marca?.toLowerCase() === formBat.marca.toLowerCase())
        .map(i => i.tipo_caja)
    )].sort((a,b) => a.localeCompare(b));
    return filtrados.length > 0 ? [...filtrados, 'Otro'] : tiposCajaLista;
  }, [formBat.marca, baterias, tiposCajaLista]);

  const {
    paginaActual, setPaginaActual,
    elementosPorPagina, setElementosPorPagina,
    totalPaginas, itemsPaginados, totalElementos
  } = usePaginacion(tab === 'baterias' ? bFiltradas : vFiltradas, 10);

  useEffect(() => { setPaginaActual(1) }, [busqueda, tab, setPaginaActual]);
  useEffect(() => {
    if (!modalBat && !modalVar) return undefined;
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-select-premium-open="true"]')) return;
      setModalBat(false);
      setModalVar(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalBat, modalVar, setModalBat, setModalVar]);

  const puedeCrear = tienePermiso(usuario, 'inventario_crear');
  const puedeEditar = tienePermiso(usuario, 'inventario_editar');
  const puedeEliminar = tienePermiso(usuario, 'inventario_eliminar');
  const columnasBaterias = useMemo(() => ([
    { key: 'referencia', label: 'Referencia', widthClassName: 'inventory-reference-col' },
    { key: 'producto', label: 'Marca · Caja · Descripción', widthClassName: 'inventory-product-col' },
    { key: 'cantidad', label: 'Cantidad', widthClassName: 'inventory-quantity-col', align: 'center' },
    { key: 'precio', label: 'Precio USD', widthClassName: 'inventory-money-col', align: 'right' },
    { key: 'estado', label: 'Estado stock', widthClassName: 'inventory-status-col', align: 'center' },
    { key: 'acciones', label: 'Acciones', widthClassName: 'inventory-actions-col', align: 'center', cellClassName: 'table-action-cell' },
  ]), []);

  const columnasVarios = useMemo(() => ([
    { key: 'referencia', label: 'Referencia', widthClassName: 'inventory-reference-col' },
    { key: 'nombre', label: 'Nombre', widthClassName: 'inventory-product-col' },
    { key: 'cantidad', label: 'Cantidad', widthClassName: 'inventory-quantity-col', align: 'center' },
    { key: 'precio', label: 'Precio', widthClassName: 'inventory-money-col', align: 'right' },
    { key: 'acciones', label: 'Acciones', widthClassName: 'inventory-actions-col', align: 'center', cellClassName: 'table-action-cell' },
  ]), []);

  if (!tienePermiso(usuario, 'inventario_ver')) {
    return (
      <div className="p-16 text-center font-black uppercase tracking-[0.3em] text-error text-xs">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="page-header">
        <PageTitle
          eyebrow="Inventario"
          titleWhite="Stock de"
          titleGold="Baterías y Otros Productos"
          subtitle="Gestiona el inventario de baterías y productos varios."
        />

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch">
           <div className="relative">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
             <input
               type="search"
               placeholder="Buscar por marca o referencia"
               className="search-input"
               value={busqueda}
               onChange={(e) => setBusqueda(e.target.value)}
             />
           </div>

          <div className="w-56">
            <SelectPremium
              options={[{ value: 'TODOS', label: 'Estado: Todos' }, { value: 'DISPONIBLE', label: 'Estado: Disponible' }, { value: 'AGOTADO', label: 'Estado: Agotado' }]}
              value={filtroStock}
              onChange={(e) => setFiltroStock(e.target.value)}
              placeholder="Estado: Todos"
            />
          </div>

          <div className="tab-group">
            <button type="button" onClick={() => setTab('baterias')} className={`tab-item ${tab === 'baterias' ? 'tab-item-active' : 'tab-item-inactive'}`}>Baterías</button>
            <button type="button" onClick={() => setTab('varios')} className={`tab-item ${tab === 'varios' ? 'tab-item-active' : 'tab-item-inactive'}`}>Otros productos</button>
          </div>

          {tab === 'baterias' && puedeCrear && (
            <Button onClick={abrirNuevaBateria} icon={<Plus size={18} />}>Ingresar item</Button>
          )}
          {tab === 'varios' && puedeCrear && (
            <Button onClick={abrirNuevoVario} icon={<Plus size={18} />}>Ingresar item</Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="text-error text-xs font-black uppercase tracking-wider border border-red-500/30 bg-red-500/10 px-6 py-3 rounded-xl">{errorMsg}</div>
      )}

      <div className="space-y-0">
        {/* DESKTOP TABLE */}
        <div className="hidden md:block">
          <TablePremium
            columns={tab === 'baterias' ? columnasBaterias : columnasVarios}
            data={itemsPaginados}
            rowKey={(row) => row.id}
            loading={cargando}
            loadingMessage="Cargando inventario…"
            emptyMessage="No hay registros en inventario."
            minWidthClass={tab === 'baterias' ? 'min-w-[920px]' : 'min-w-[820px]'}
            renderCell={(row, column) => {
              if (tab === 'baterias') {
                if (column.key === 'referencia') return <span className="cell-main text-accent">{row.codigo}</span>;
                if (column.key === 'producto') return (
                  <>
                    <div className="cell-main truncate">{row.marca}</div>
                    <div className="cell-sub uppercase tracking-widest truncate">{row.tipo_caja}</div>
                    <div className="cell-sub truncate">{row.condicion}</div>
                  </>
                );
                if (column.key === 'cantidad') return <span className="cell-main">{row.cantidad}</span>;
                if (column.key === 'precio') return <span className="money-cell">${safeNumber(row.precio).toFixed(2)}</span>;
                if (column.key === 'estado') {
                  return (
                    <div className="action-cell">
                      <Badge cantidad={row.cantidad} size="md">
                        {row.estado_stock === 'sin_stock' ? 'Sin stock' : row.cantidad <= 5 ? 'Stock bajo' : 'Con stock'}
                      </Badge>
                    </div>
                  );
                }
                if (column.key === 'acciones') {
                  return (
                    <div className="action-cell">
                      {puedeEditar && <button type="button" onClick={() => abrirEditarBateria(row)} className="action-btn">Editar</button>}
                      {puedeEliminar && <button type="button" onClick={() => eliminarBateriaFn(row.id)} className="action-btn delete-btn !min-w-[40px] !px-0"><Trash2 size={16} /></button>}
                    </div>
                  );
                }
                return null;
              }

              if (column.key === 'referencia') return <span className="cell-main text-accent">{row.codigo}</span>;
              if (column.key === 'nombre') return (
                <>
                  <div className="cell-main truncate">{row.nombre}</div>
                  <div className="cell-sub truncate">{row.descripcion}</div>
                </>
              );
              if (column.key === 'cantidad') return <span className="cell-main">{row.cantidad}</span>;
              if (column.key === 'precio') return <span className="money-cell">${safeNumber(row.precio).toFixed(2)}</span>;
              if (column.key === 'acciones') {
                return (
                  <div className="action-cell">
                    {puedeEditar && <button type="button" onClick={() => abrirEditVario(row)} className="action-btn">Editar</button>}
                    {puedeEliminar && <button type="button" onClick={() => eliminarVarFn(row.id)} className="action-btn delete-btn !min-w-[40px] !px-0"><Trash2 size={16} /></button>}
                  </div>
                );
              }
              return null;
            }}
            footer={
              <Paginacion
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                totalElementos={totalElementos}
                elementosPorPagina={elementosPorPagina}
                setPaginaActual={setPaginaActual}
                setElementosPorPagina={setElementosPorPagina}
              />
            }
          />
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden p-4 space-y-4">
          {tab === 'baterias' ? (
            itemsPaginados.map((row) => (
              <div key={row.id} className="item-card card-premium p-4">
                <div className="flex justify-between items-start">
                  <div>
                     <p className="text-accent font-black text-sm uppercase tracking-wider">{row.codigo}</p>
                     <h3 className="text-text-primary font-bold text-lg">{row.marca}</h3>
                     <p className="text-[10px] text-text-muted uppercase tracking-widest">{row.tipo_caja} · {row.condicion}</p>
                  </div>
                  <div className="flex items-center">
                    <Badge cantidad={row.cantidad} size="sm">{row.estado_stock === 'sin_stock' ? 'Sin stock' : row.cantidad <= 5 ? 'Stock bajo' : 'Con stock'}</Badge>
                  </div>
                </div>
                     <div className="flex justify-between items-end border-t border-border-default pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Stock</span>
                     <span className="text-text-primary font-black text-xl">{row.cantidad}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Precio</span>
                     <span className="money-value text-xl">${safeNumber(row.precio).toFixed(2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                   {puedeEditar && <button onClick={() => abrirEditarBateria(row)} className="w-full px-4 py-2 font-black uppercase tracking-wide rounded-xl bg-black border border-border-default text-accent hover:bg-yellow-500/10 transition-all justify-center">Editar</button>}
                   {puedeEliminar && <button onClick={() => eliminarBateriaFn(row.id)} className="w-full p-2 rounded-xl bg-red-900/30 border border-red-500/30 text-error hover:bg-red-500/10 transition-all justify-center"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))
          ) : (
            itemsPaginados.map((row) => (
               <div key={row.id} className="item-card card-premium p-4">
                <div className="flex justify-between items-start">
                  <div>
                     <p className="text-accent font-black text-sm uppercase tracking-wider font-mono">{row.codigo}</p>
                     <h3 className="text-text-primary font-bold text-lg">{row.nombre}</h3>
                     <p className="text-[10px] text-text-muted uppercase tracking-widest truncate">{row.descripcion}</p>
                  </div>
                </div>
                 <div className="flex justify-between items-end border-t border-border-default pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Stock</span>
                     <span className="text-text-primary font-black text-xl">{row.cantidad}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Precio</span>
                     <span className="money-value text-xl">${safeNumber(row.precio).toFixed(2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                   {puedeEditar && <button onClick={() => abrirEditVario(row)} className="w-full px-4 py-2 font-black uppercase tracking-wide rounded-xl bg-black border border-border-default text-accent hover:bg-yellow-500/10 transition-all justify-center">Editar</button>}
                   {puedeEliminar && <button onClick={() => eliminarVarFn(row.id)} className="w-full p-2 rounded-xl bg-red-900/30 border border-red-500/30 text-error hover:bg-red-500/10 transition-all justify-center"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))
          )}
          {!cargando && (
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos}
              elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />
          )}
        </div>
      </div>

      {/* MODAL BATERÍAS */}
      {modalBat && (
        <div className="modal-backdrop">
          <div className="modal-premium w-full md:max-w-xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
            <form onSubmit={guardarBateria}>
              <div className="modal-header">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic">
                    {editBatEsNuevo ? 'Ingresar' : 'Editar'} <span className="text-yellow-100">Batería</span>
                  </h2>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mt-1">Gestión de stock de baterías</p>
                </div>
                <button type="button" onClick={() => setModalBat(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-zinc-900/80 transition-all"><X size={20} /></button>
              </div>

              <div className="modal-body overflow-visible">
                <div className="form-grid">
                  <Autocomplete label="Marca" options={marcasLista} value={formBat.marca}
                    onChange={(v) => setFormBat({ ...formBat, marca: v, marca_otro: v === 'Otros' ? formBat.marca_otro : '' })}
                    placeholder="Seleccione o escriba una marca" />
                  <Autocomplete label="Tipo de Caja" options={tiposCajaProducto} value={formBat.tipo_caja}
                    onChange={(v) => setFormBat({ ...formBat, tipo_caja: v, tipo_caja_otro: v === 'Otro' ? formBat.tipo_caja_otro : '' })}
                    placeholder="Seleccione o escriba un tipo de caja" />
                </div>

                {(formBat.marca === 'Otros' || formBat.tipo_caja === 'Otro') && (
                  <div className="form-grid">
                    {formBat.marca === 'Otros' && (
                      <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Nueva Marca</label>
                        <input type="text" className="input-premium" placeholder="Ingrese la nueva marca" value={formBat.marca_otro || ''}
                          onChange={(e) => setFormBat({ ...formBat, marca_otro: e.target.value })} required />
                      </div>
                    )}
                    {formBat.tipo_caja === 'Otro' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Nuevo Tipo de Caja</label>
                        <input type="text" className="input-premium" placeholder="Ingrese el nuevo tipo de caja" value={formBat.tipo_caja_otro || ''}
                          onChange={(e) => setFormBat({ ...formBat, tipo_caja_otro: e.target.value })} required />
                      </div>
                    )}
                  </div>
                )}

                <div className="form-grid">
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Condición</label>
                    <div className="relative">
                      <SelectPremium
                        options={condicionesLista.map(c => ({ value: c, label: c }))}
                        value={formBat.condicion || 'Nueva'}
                        onChange={(e) => setFormBat({ ...formBat, condicion: e.target.value })}
                        placeholder="Seleccione una condición"
                        className="w-full"
                      />
                       <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-text-muted">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Cantidad</label>
                    <input type="number" className="input-premium" value={formBat.cantidad}
                      onChange={(e) => setFormBat({ ...formBat, cantidad: e.target.value })} min="0" required
                      />
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Precio Unitario (USD)</label>
                  <input type="number" step="0.01" className="input-premium" placeholder="0.00"
                    value={formBat.precio} onChange={(e) => setFormBat({ ...formBat, precio: e.target.value })} required />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                   <Button variant="secondary" type="button" onClick={() => setModalBat(false)} fullWidth>Cancelar</Button>
                   <Button type="submit" fullWidth icon={<Save size={16} />}>Guardar Cambios</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OTROS PRODUCTOS */}
      {modalVar && (
        <div className="modal-backdrop">
          <div className="modal-premium w-full md:max-w-xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
            <form onSubmit={guardarVario}>
              <div className="modal-header">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic">Ingresar <span className="text-yellow-100">Producto</span></h2>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mt-1">Referencia: {proxVar}</p>
                </div>
                 <button type="button" onClick={() => setModalVar(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-zinc-900/80 transition-all"><X size={20} /></button>
              </div>

              <div className="modal-body overflow-visible">
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Nombre del Producto</label>
                  <input type="text" className="input-premium" placeholder="Ingrese el nombre del producto"
                    value={formVar.nombre} onChange={(e) => setFormVar({ ...formVar, nombre: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Descripción</label>
                  <textarea className="input-premium !h-auto min-h-[100px] resize-none pt-3"
                    value={formVar.descripcion} onChange={(e) => setFormVar({ ...formVar, descripcion: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Cantidad</label>
                    <input type="number" className="input-premium" value={formVar.cantidad}
                      onChange={(e) => setFormVar({ ...formVar, cantidad: e.target.value })} required
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1">Precio Unitario</label>
                    <input type="number" step="0.01" className="input-premium" value={formVar.precio}
                      onChange={(e) => setFormVar({ ...formVar, precio: e.target.value })} required />
                  </div>
                </div>
                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <Button variant="secondary" type="button" onClick={() => setModalVar(false)} fullWidth>Cancelar</Button>
                  <Button type="submit" fullWidth>Confirmar Ingreso</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaProductos;

