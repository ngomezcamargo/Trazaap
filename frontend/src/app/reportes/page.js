'use client';

import { useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { ROLES } from '@/utilidades/roles';
import { reportesServicio } from '@/servicios/reportes.servicio';

export default function ReportesPage() {
  const [lote, setLote] = useState('');
  const [lotesTexto, setLotesTexto] = useState('');
  const [consolidado, setConsolidado] = useState(null);
  const [error, setError] = useState('');
  const lotes = lotesTexto.split(/[\n,;]/).map((x) => x.trim()).filter(Boolean);
  const consolidar = async () => { setError(''); try { setConsolidado(await reportesServicio.consolidar(lotes)); } catch (e) { setError(e.message); } };
  const exportar = async () => { setError(''); try { const blob=await reportesServicio.excel(lotes);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='trazabilidad-multilote.xlsx';a.click();URL.revokeObjectURL(url); } catch(e){setError(e.message);} };

  const abrirReporte = (event) => {
    event.preventDefault();
    const loteNormalizado = lote.trim();
    if (!loteNormalizado) return;
    window.open(`/reportes/trazabilidad/${encodeURIComponent(loteNormalizado)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp
          titulo="Reportes"
          subtitulo="Genera informes de trazabilidad listos para imprimir o guardar como PDF."
        >
          <div className="tarjeta reporte-generador">
            <div>
              <h3>Reporte de trazabilidad con validacion blockchain</h3>
              <p className="texto-secundario">
                Ingresa el lote producido para generar un reporte formal con eventos, origen de materias primas y estados de validacion.
              </p>
            </div>
            <form onSubmit={abrirReporte} className="grid grid-2">
              <div className="campo">
                <label>Lote producido</label>
                <input value={lote} onChange={(event) => setLote(event.target.value)} placeholder="Ej. BG-001" required />
              </div>
              <div className="acciones reporte-generador-acciones">
                <button className="boton" type="submit">Generar reporte</button>
              </div>
            </form>
          </div>
          <div className="tarjeta reporte-generador" style={{marginTop:16}}><div><h3>Reporte consolidado multilote</h3><p className="texto-secundario">Ingrese uno por línea o separados por coma. Máximo 50 lotes.</p></div>{error&&<div className="alerta error">{error}</div>}<div className="campo"><label>Lotes ({lotes.length}/50)</label><textarea value={lotesTexto} onChange={e=>setLotesTexto(e.target.value)} placeholder={'BG-20260801-001\nBG-20260801-002'}/></div><div className="acciones"><button className="boton secundario" disabled={!lotes.length||lotes.length>50} onClick={consolidar}>Consolidar</button><button className="boton" disabled={!lotes.length||lotes.length>50} onClick={exportar}>Exportar Excel</button></div>{consolidado&&<div><p><strong>Encontrados:</strong> {consolidado.encontrados} de {consolidado.solicitados}</p><p className="texto-secundario">{consolidado.mapeo_normativo}</p>{consolidado.errores?.length>0&&<div className="alerta error">Sin resultado: {consolidado.errores.map(x=>x.lote).join(', ')}</div>}<div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Lote</th><th>Producto</th><th>Eventos</th><th>Despachos</th><th>Controles</th></tr></thead><tbody>{consolidado.lotes.map(x=><tr key={x.lote}><td>{x.lote}</td><td>{x.produccion?.productos?.map(p=>p.producto).join(', ')||'-'}</td><td>{x.eventos?.length||0}</td><td>{x.despachos?.length||0}</td><td>{x.controlesCalidad?.length||0}</td></tr>)}</tbody></table></div></div>}</div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
