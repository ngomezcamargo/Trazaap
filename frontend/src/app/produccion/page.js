import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioOrdenProduccion } from '@/modulos/produccion/FormularioOrdenProduccion';

export default function ProduccionPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp>
        <h2>Produccion</h2>
        <p>Gestion de orden diaria, consumos, tiempos y lote terminado.</p>
        <FormularioOrdenProduccion />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
