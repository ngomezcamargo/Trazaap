'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioRecepcion } from '@/modulos/recepciones/FormularioRecepcion';

export default function NuevaRecepcionPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp titulo="Registro de recepcion" subtitulo="Ingreso de materias primas por lote y proveedor.">
        <FormularioRecepcion />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
