'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { BuscadorTrazabilidad } from '@/modulos/trazabilidad/BuscadorTrazabilidad';
import { ROLES } from '@/utilidades/roles';

export default function TrazabilidadPage() {
  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE, ROLES.OPERARIO]}>
        <ContenedorApp
          titulo="Consulta de trazabilidad de lote producido"
          subtitulo="Reconstruye la cadena desde el lote terminado hasta las materias primas de origen."
        >
          <BuscadorTrazabilidad />
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
