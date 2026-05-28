const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/paginas/VistaTransacciones.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Reemplazar la sección de "Método de Pago" por la sección IVA
const metodoPagoSection = `               {/* 3. MÉTODO DE PAGO */}
               <div className="space-y-4">
                 <label className="text-xs font-black uppercase tracking-widest text-brand-500">3. Método de Pago</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-900/70 border border-slate-700/40 rounded-2xl backdrop-blur-md">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Selección de Pago</label>
                     <select value={h.metodoPago} onChange={e => h.setMetodoPago(e.target.value)}
                       className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-brand-500/40 transition-colors">
                       <option value="efectivo">Efectivo</option>
                       <option value="transferencia">Transferencia</option>
                       <option value="tarjeta">Tarjeta</option>
                     </select>
                   </div>
                   <div className="p-4 bg-slate-900/70 border border-slate-700/40 rounded-2xl backdrop-blur-md">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Notas de Venta</label>
                     <input type="text" value={h.notas} onChange={e => h.setNotas(e.target.value)} placeholder="Opcional..."
                       className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-brand-500/40 transition-colors" />
                   </div>
                 </div>
               </div>

               {/* 4. RESUMEN DE VENTA */}`;

const ivaSection = `               {/* 3. IVA OPCIONAL */}
               <div className="space-y-4">
                 <label className="text-xs font-black uppercase tracking-widest text-brand-500">3. Impuestos</label>
                 <div className="p-4 bg-slate-900/70 border border-slate-700/40 rounded-2xl backdrop-blur-md hover:border-brand-500/40 transition-colors">
                   <div className="flex items-center justify-between cursor-pointer" onClick={() => h.ventaItems.setAplicarIVAGlobal(!h.ventaItems.aplicarIVAGlobal)}>
                     <div>
                       <p className="text-sm text-slate-200 font-bold">Aplicar IVA 15%</p>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{h.ventaItems.aplicarIVAGlobal ? 'IVA Habilitado' : 'IVA Deshabilitado'}</p>
                     </div>
                     <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${h.ventaItems.aplicarIVAGlobal ? 'bg-brand-500' : 'bg-slate-700'}`}>
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${h.ventaItems.aplicarIVAGlobal ? 'translate-x-6' : 'translate-x-1'}`} />
                     </div>
                   </div>
                 </div>
               </div>

               {/* 4. RESUMEN DE VENTA */}`;

content = content.replace(metodoPagoSection, ivaSection);

// Cambiar la numeración de "4. Resumen Final" a "4. Resumen Final" (ya está bien pero verifica)
content = content.replace(/label className="text-xs font-black uppercase tracking-widest text-brand-500">4\. Resumen Final/g, 
                        'label className="text-xs font-black uppercase tracking-widest text-brand-500">4. Resumen Final');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Modal venta actualizado con IVA toggle y método pago eliminado');
