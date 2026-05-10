'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { BuscadorTrazabilidad } from '@/modulos/trazabilidad/BuscadorTrazabilidad';

export default function TrazabilidadPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp
        titulo="Consulta de trazabilidad de lote producido"
        subtitulo="Reconstruye la cadena desde el lote terminado hasta las materias primas de origen."
      >
        <BuscadorTrazabilidad />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
