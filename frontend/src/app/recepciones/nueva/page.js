'use client';

import { useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioRecepcion } from '@/modulos/recepciones/FormularioRecepcion';

export default function NuevaRecepcionPage() {
  const [abierto, setAbierto] = useState(false);

  return (
    <GuardiaSesion>
      <ContenedorApp titulo="Registro de recepcion" subtitulo="Ingreso de materias primas por lote y proveedor.">
        <div className="tarjeta">
          <div className="acciones" style={{ marginTop: 0 }}>
            <button className="boton" type="button" onClick={() => setAbierto(true)}>Nueva recepcion</button>
          </div>
        </div>

        {abierto && (
          <div className="modal-fondo" onClick={() => setAbierto(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-encabezado-form">
                <button className="boton secundario modal-cancelar" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
                <h3>Nueva recepcion</h3>
              </div>
              <FormularioRecepcion />
            </div>
          </div>
        )}
      </ContenedorApp>
    </GuardiaSesion>
  );
}
