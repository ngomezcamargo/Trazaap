'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { ROLES } from '@/utilidades/roles';

export default function InventarioPage() {
  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Inventario" subtitulo="Resumen de insumos y lotes terminados. Vista base para crecimiento.">
          <div className="tarjeta">
            <h3>Inventario operativo</h3>
            <p>Vista placeholder conectada al menu gerencial. Lista para enlazar stock real de materias y producto terminado.</p>
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
