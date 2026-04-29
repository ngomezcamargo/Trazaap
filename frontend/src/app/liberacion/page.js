import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioLiberacion } from '@/modulos/liberacion/FormularioLiberacion';

export default function LiberacionPage() {
  return (
    <GuardiaSesion>
      <ContenedorApp>
        <h2>Liberacion de producto</h2>
        <p>Registro de peso, vencimiento y estado de liberacion.</p>
        <FormularioLiberacion />
      </ContenedorApp>
    </GuardiaSesion>
  );
}
