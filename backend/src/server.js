import { createApp } from './app.js';
import { entorno } from './configuracion/entorno.js';
import { probarConexionPostgres } from './configuracion/postgresql.js';
import { iniciarTareaAlertasVencimiento } from './modulos/liberacion/vencimientos.job.js';

async function bootstrap() {
  await probarConexionPostgres();

  const app = createApp();
  app.listen(entorno.port, () => {
    console.log(`Trazaap API ejecutandose en http://localhost:${entorno.port}`);
  });
  iniciarTareaAlertasVencimiento();
}

bootstrap().catch((error) => {
  console.error('Error de inicio:', error.message);
  process.exit(1);
});
