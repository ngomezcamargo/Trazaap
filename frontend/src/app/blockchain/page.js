'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { ROLES } from '@/utilidades/roles';

export default function BlockchainPage() {
  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp
          titulo="Blockchain"
          subtitulo="Eventos criticos de trazabilidad y estado de integracion futura con Hyperledger Fabric."
        >
          <div className="tarjeta">
            <h3>Modulo preparado para integracion</h3>
            <p>
              Esta vista centraliza la consulta de eventos blockchain. La trazabilidad por lote ya incluye hashes y esta
              preparada para evolucionar a tablero de auditoria.
            </p>
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
