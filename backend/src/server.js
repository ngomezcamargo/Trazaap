import { createApp } from './app.js';
import { entorno } from './configuracion/entorno.js';
import { probarConexionPostgres } from './configuracion/postgresql.js';
import { iniciarTareaAlertasVencimiento } from './modulos/liberacion/vencimientos.job.js';
import { detenerProcesadorOutbox, iniciarProcesadorOutbox } from './modulos/blockchain/outbox.worker.js';

async function bootstrap() {
  await probarConexionPostgres();

  const app = createApp();
  const servidor = app.listen(entorno.port, () => {
    console.log(`Trazaap API ejecutandose en http://localhost:${entorno.port}`);
  });
  iniciarTareaAlertasVencimiento();
  iniciarProcesadorOutbox();

  const cerrar = (senal) => {
    console.log(`Cerrando Trazaap API por ${senal}`);
    detenerProcesadorOutbox();
    servidor.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGINT', () => cerrar('SIGINT'));
  process.once('SIGTERM', () => cerrar('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Error de inicio:', error.message);
  process.exit(1);
});
