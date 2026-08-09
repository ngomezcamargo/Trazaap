'use client';

import { useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioRecepcion } from '@/modulos/recepciones/FormularioRecepcion';
import { ROLES } from '@/utilidades/roles';

export default function NuevaRecepcionPage() {
  const [abierto, setAbierto] = useState(false);
  const [message, setMessage] = useState('');

  const abrirFormulario = () => {
    setMessage('');
    setAbierto(true);
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.OPERARIO]}>
        <ContenedorApp titulo="Registro de recepcion" subtitulo="Ingreso de materias primas por lote y proveedor.">
          <div className="tarjeta">
            <div className="acciones" style={{ marginTop: 0 }}>
              <button className="boton" type="button" onClick={abrirFormulario}>Nueva recepcion</button>
            </div>
            {message && <div className="alerta ok">{message}</div>}
          </div>

          {abierto && (
            <div className="modal-fondo" onClick={() => setAbierto(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-encabezado-form">
                  <button className="boton secundario modal-cancelar" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
                  <h3>Nueva recepcion</h3>
                </div>
                <FormularioRecepcion
                  onSaved={() => {
                    setAbierto(false);
                    setMessage('Recepcion registrada correctamente.');
                  }}
                />
              </div>
            </div>
          )}
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
