'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { obtenerUsuario } from '@/utilidades/sesion';

export default function PanelPage() {
  const usuario = obtenerUsuario();

  return (
    <GuardiaSesion>
      <ContenedorApp
        titulo="Panel operativo"
        subtitulo="Vista base del Sprint 1 para autenticacion, proveedores, recepciones e inspecciones."
      >
        <div className="grid grid-2">
          <div className="tarjeta kpi">
            <span>Sesion activa</span>
            <strong>{usuario?.email || '-'}</strong>
            <span className="estado">{usuario?.role || 'sin rol'}</span>
          </div>

          <div className="tarjeta kpi">
            <span>Estado del alcance</span>
            <strong>Sprint 1</strong>
            <span>Base simplificada y lista para crecer por iteraciones.</span>
          </div>
        </div>
      </ContenedorApp>
    </GuardiaSesion>
  );
}
