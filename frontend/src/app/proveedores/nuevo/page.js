'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioProveedor } from '@/modulos/proveedores/FormularioProveedor';

export default function NuevoProveedorPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp titulo="Nuevo proveedor" subtitulo="Registro operativo de proveedores para recepcion.">
        <FormularioProveedor />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
