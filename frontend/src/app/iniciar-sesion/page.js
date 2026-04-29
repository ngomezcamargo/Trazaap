import { FormularioIngreso } from '@/modulos/autenticacion/FormularioIngreso';

export default function IniciarSesionPage() {
  return (
    <div className="pantalla-login">
      <div className="panel-login">
        <div className="encabezado-login" style={{ marginBottom: 16 }}>
          <span className="sello">TRAZAAP</span>
          <h2>Ingreso al sistema</h2>
          <p>Trazabilidad alimentaria segura</p>
        </div>
        <FormularioIngreso />
      </div>
    </div>
  );
}
