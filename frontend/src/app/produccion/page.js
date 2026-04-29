import { ContenedorApp } from '@/comunes/ContenedorApp';
import { FormularioOrdenProduccion } from '@/modulos/produccion/FormularioOrdenProduccion';

export default function ProduccionPage() {
  return (
    <ContenedorApp>
      <h2>Produccion</h2>
      <p>Gestion de orden diaria, consumos, tiempos y lote terminado.</p>
      <FormularioOrdenProduccion />
    </ContenedorApp>
  );
}
