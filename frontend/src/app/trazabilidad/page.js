'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { BuscadorTrazabilidad } from '@/modulos/trazabilidad/BuscadorTrazabilidad';

export default function TrazabilidadPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp
        titulo="Consulta de trazabilidad por lote"
        subtitulo="Vista simple de recepcion, inspeccion y eventos del lote."
      >
        <BuscadorTrazabilidad />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
