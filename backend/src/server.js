import { createApp } from './app.js';
import { entorno } from './configuracion/entorno.js';
import { probarConexionPostgres } from './configuracion/postgresql.js';

async function bootstrap() {
  await probarConexionPostgres();

  const app = createApp();
  app.listen(entorno.port, () => {
    console.log(`Trazaap API ejecutandose en http://localhost:${entorno.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Error de inicio:', error.message);
  process.exit(1);
});
