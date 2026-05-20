'use client';

import { useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { ROLES } from '@/utilidades/roles';

export default function ReportesPage() {
  const [lote, setLote] = useState('');

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
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
