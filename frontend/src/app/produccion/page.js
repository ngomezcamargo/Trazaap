import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioOrdenProduccion } from '@/modulos/produccion/FormularioOrdenProduccion';

export default function ProduccionPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp titulo="Produccion" subtitulo="Ordenes, orden activa, productos y tiempos en subsecciones.">
        <FormularioOrdenProduccion />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
