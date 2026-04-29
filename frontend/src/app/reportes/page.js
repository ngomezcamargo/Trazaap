'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { ROLES } from '@/utilidades/roles';

export default function ReportesPage() {
  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Reportes" subtitulo="Espacio reservado para reportes historicos y analitica operativa futura.">
          <div className="tarjeta">
            <h3>Reportes futuros</h3>
            <p>Seccion habilitada en interfaz para siguiente iteracion sin afectar funcionalidades actuales.</p>
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
