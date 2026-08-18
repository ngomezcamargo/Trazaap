import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { listarOutbox, reintentarEventoOutbox, resumirOutbox } from './outbox.repository.js';
import { procesarOutboxAhora } from './outbox.worker.js';

export async function listarOutboxController(req, res) {
  res.json(await listarOutbox({ estado: req.query.estado || '', limite: req.query.limite }));
}

export async function resumirOutboxController(req, res) {
  res.json(await resumirOutbox());
}

export async function reintentarOutboxController(req, res) {
  const item = await reintentarEventoOutbox(Number(req.params.id));
  if (!item) throw new ErrorHttp(404, 'Evento pendiente no encontrado o no reintentable');
  procesarOutboxAhora().catch((error) => console.error('[Fabric outbox]', error.message));
  res.json(item);
}

