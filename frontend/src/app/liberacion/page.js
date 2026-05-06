'use client';

import { useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioLiberacion } from '@/modulos/liberacion/FormularioLiberacion';

export default function LiberacionPage() {
  const [abierto, setAbierto] = useState(false);

  return (
    <GuardiaSesion>
      <ContenedorApp titulo="Liberacion de producto" subtitulo="Registro de peso, vencimiento y estado de liberacion.">
        <div className="tarjeta">
          <div className="acciones" style={{ marginTop: 0 }}>
            <button className="boton" type="button" onClick={() => setAbierto(true)}>Registrar liberacion</button>
          </div>
        </div>

        {abierto && (
          <div className="modal-fondo" onClick={() => setAbierto(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-encabezado-form">
                <button className="boton secundario modal-cancelar" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
                <h3>Nueva liberacion</h3>
              </div>
              <FormularioLiberacion />
            </div>
          </div>
        )}
      </ContenedorApp>
    </GuardiaSesion>
  );
}
