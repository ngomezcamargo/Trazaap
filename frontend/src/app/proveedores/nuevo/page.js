'use client';

import { useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioProveedor } from '@/modulos/proveedores/FormularioProveedor';
import { ROLES } from '@/utilidades/roles';

export default function NuevoProveedorPage() {
  const [abierto, setAbierto] = useState(false);
  const [message, setMessage] = useState('');

  const abrirFormulario = () => {
    setMessage('');
    setAbierto(true);
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.ADMINISTRADOR]}>
        <ContenedorApp titulo="Nuevo proveedor" subtitulo="Registro operativo de proveedores para recepcion.">
          <div className="tarjeta">
            <div className="acciones" style={{ marginTop: 0 }}>
              <button className="boton" type="button" onClick={abrirFormulario}>Agregar proveedor</button>
            </div>
            {message && <div className="alerta ok">{message}</div>}
          </div>

          {abierto && (
            <div className="modal-fondo" onClick={() => setAbierto(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-encabezado-form">
                  <button className="boton secundario modal-cancelar" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
                  <h3>Nuevo proveedor</h3>
                </div>
                <FormularioProveedor
                  onSaved={() => {
                    setAbierto(false);
                    setMessage('Proveedor creado correctamente.');
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
