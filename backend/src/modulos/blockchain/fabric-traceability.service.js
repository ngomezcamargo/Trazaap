import crypto from 'crypto';
import fs from 'fs/promises';
import grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import { entorno } from '../../configuracion/entorno.js';

function normalizarEventoFabric(buffer) {
  const text = Buffer.from(buffer).toString('utf8');
  return text ? JSON.parse(text) : null;
}

export class FabricTraceabilityService {
  constructor(config = entorno.fabric) {
    this.config = config;
  }

  async crearGateway() {
    if (!this.config.enabled) {
      throw new Error('Integracion Fabric deshabilitada por configuracion');
    }

    let tlsRootCert;
    let cert;
    let privateKeyPem;
    try {
      [tlsRootCert, cert, privateKeyPem] = await Promise.all([
        fs.readFile(this.config.tlsCertPath),
        fs.readFile(this.config.certPath),
        fs.readFile(this.config.keyPath)
      ]);
    } catch (error) {
      throw new Error(`No se pudo cargar la identidad Fabric configurada: ${error.message}`);
    }

    const client = new grpc.Client(this.config.peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {
      'grpc.ssl_target_name_override': this.config.peerHostAlias
    });
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const gateway = connect({
      client,
      identity: { mspId: this.config.mspId, credentials: cert },
      signer: signers.newPrivateKeySigner(privateKey),
      hash: hash.sha256
    });
    return { gateway, client };
  }

  async usarContrato(callback) {
    let gateway;
    let client;
    try {
      ({ gateway, client } = await this.crearGateway());
      const network = gateway.getNetwork(this.config.channelName);
      const contract = network.getContract(this.config.chaincodeName);
      return await callback(contract);
    } catch (error) {
      const wrapped = new Error(`Operacion Fabric fallida: ${error.message}`);
      wrapped.cause = error;
      throw wrapped;
    } finally {
      gateway?.close();
      client?.close();
    }
  }

  async enviarTransaccion(nombre, argumentos) {
    return this.usarContrato(async (contract) => {
      const submitted = await contract.submitAsync(nombre, {
        arguments: argumentos.map((argumento) => String(argumento))
      });
      const status = await submitted.getStatus();
      const result = await submitted.getResult();
      if (!status.successful) {
        throw new Error(`Transaccion Fabric no valida. Codigo de commit: ${status.code}`);
      }
      return {
        transactionId: submitted.getTransactionId(),
        blockNumber: status.blockNumber ? Number(status.blockNumber) : null,
        successful: status.successful,
        code: status.code,
        evento: normalizarEventoFabric(result)
      };
    });
  }

  registrarEvento(evento) {
    return this.enviarTransaccion('registrarEvento', [
      evento.tipoEvento,
      String(evento.idEntidad),
      String(evento.lote || ''),
      String(evento.actor || 'sistema'),
      evento.fechaEvento,
      JSON.stringify(evento.payload || {})
    ]);
  }

  async validarEvento(tipoEvento, idEntidad, payloadActual) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction(
        'validarEvento',
        tipoEvento,
        String(idEntidad),
        JSON.stringify(payloadActual || {})
      );
      return normalizarEventoFabric(result);
    });
  }

  async consultarEvento(tipoEvento, idEntidad) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('consultarEvento', tipoEvento, String(idEntidad));
      return normalizarEventoFabric(result);
    });
  }

  async consultarEventosPorLote(lote) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('consultarEventosPorLote', lote);
      return normalizarEventoFabric(result) || [];
    });
  }

  registrarCorreccion(datos) {
    return this.enviarTransaccion('registrarCorreccionEvento', [
      datos.tipoEventoOriginal,
      String(datos.idEntidadOriginal),
      datos.motivoCorreccion,
      datos.actor,
      JSON.stringify(datos.payloadCorregido || {})
    ]);
  }

  async consultarHistorial(tipoEvento, idEntidad) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('consultarHistorialEvento', tipoEvento, String(idEntidad));
      return normalizarEventoFabric(result);
    });
  }

  async validarDespacho(datos) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('validarDespacho', JSON.stringify(datos));
      return normalizarEventoFabric(result);
    });
  }

  registrarDespacho(datos) {
    return this.enviarTransaccion('registrarDespacho', [JSON.stringify(datos)]);
  }

  inicializarInventarioProductoTerminado(datos) {
    return this.enviarTransaccion('inicializarInventarioProductoTerminado', [JSON.stringify(datos)]);
  }

  async consultarSaldoInventario(idInventario) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('consultarSaldoInventario', String(idInventario));
      return normalizarEventoFabric(result);
    });
  }

  confirmarRecepcionCliente(datos) {
    return this.enviarTransaccion('confirmarRecepcionCliente', [JSON.stringify(datos)]);
  }

  registrarAlertaVencimiento(datos) {
    return this.enviarTransaccion('registrarAlertaVencimiento', [JSON.stringify(datos)]);
  }

  registerEventOnFabric(eventEvidence) {
    return this.registrarEvento({
      tipoEvento: eventEvidence.tipoEvento,
      idEntidad: eventEvidence.idEntidad || eventEvidence.eventId,
      lote: eventEvidence.lote || eventEvidence.codigoLote,
      payload: eventEvidence.payload || eventEvidence.payloadNormalizado || {},
      fechaEvento: eventEvidence.fechaEvento || eventEvidence.timestamp,
      actor: eventEvidence.actor || eventEvidence.responsable
    });
  }

  async getEventFromFabric(eventId) {
    const [tipoEvento, ...rest] = String(eventId).split(':');
    return this.consultarEvento(tipoEvento, rest.join(':'));
  }

  getEventsByLotFromFabric(codigoLote) {
    return this.consultarEventosPorLote(codigoLote);
  }
}

export const fabricTraceabilityService = new FabricTraceabilityService();
