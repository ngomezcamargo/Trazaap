import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioOrdenProduccion } from '@/modulos/produccion/FormularioOrdenProduccion';
import { ROLES } from '@/utilidades/roles';

export default function ProduccionPage() {
  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE, ROLES.OPERARIO]}>
        <ContenedorApp titulo="Produccion" subtitulo="Ordenes, orden activa, productos y tiempos en subsecciones.">
          <FormularioOrdenProduccion />
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
