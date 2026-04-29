'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioInspeccion } from '@/modulos/recepciones/FormularioInspeccion';

export default function InspeccionRecepcionPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp
        titulo="Inspeccion de recepcion"
        subtitulo="Control de calidad inicial sobre lotes recibidos."
      >
        <FormularioInspeccion />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
