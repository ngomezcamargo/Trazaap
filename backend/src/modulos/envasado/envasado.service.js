import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoCritico } from '../blockchain/blockchain.service.js';
import { buscarManufacturaEnvasado, crearEnvasado, listarEnvasados, listarPendientesEnvasado } from './envasado.repository.js';
export const listarEnvasadosService = (lote) => listarEnvasados(lote);
export const listarPendientesEnvasadoService = () => listarPendientesEnvasado();
export async function crearEnvasadoService(data, actor) {
  const manufactura = await buscarManufacturaEnvasado(data.id_manufactura);
  if (!manufactura) throw new ErrorHttp(404, 'Manufactura no encontrada');
  let registro;
  try { registro = await crearEnvasado({...data, lote: manufactura.lote_producido}); }
  catch (error) { if (error.code === '23505') throw new ErrorHttp(409, 'El lote ya tiene una operacion de envasado'); throw error; }
  const blockchain = await registrarEventoCritico('envasado_embalado', registro.id_envasado, actor.email);
  return { registro, blockchain };
}
