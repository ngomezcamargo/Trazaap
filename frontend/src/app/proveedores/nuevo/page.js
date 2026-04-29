'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioProveedor } from '@/modulos/proveedores/FormularioProveedor';
import { ROLES } from '@/utilidades/roles';

export default function NuevoProveedorPage() {
  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Nuevo proveedor" subtitulo="Registro operativo de proveedores para recepcion.">
          <FormularioProveedor />
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
