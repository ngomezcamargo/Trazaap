import { FormularioIngreso } from '@/modulos/autenticacion/FormularioIngreso';

export default function IniciarSesionPage() {
  return (
    <div className="pantalla-login">
      <div className="panel-login">
        <div className="encabezado" style={{ marginBottom: 16 }}>
          <h2>Ingreso a Trazaap</h2>
          <p>Sistema interno de trazabilidad.</p>
        </div>
        <FormularioIngreso />
      </div>
    </div>
  );
}
