import crypto from 'crypto';
import fs from 'fs/promises';
import grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import { entorno } from '../../configuracion/entorno.js';

function normalizarEventoFabric(buffer) {
  const text = Buffer.from(buffer).toString('utf8');
  return text ? JSON.parse(text) : null;
}

function normalizarBooleanFabric(buffer) {
  return Buffer.from(buffer).toString('utf8') === 'true';
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
      identity: {
        mspId: this.config.mspId,
        credentials: cert
      },
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
      throw new Error(`Operacion Fabric fallida: ${error.message}`);
    } finally {
      gateway?.close();
      client?.close();
    }
  }

  async registerEventOnFabric(eventEvidence) {
    return this.usarContrato(async (contract) => {
      const submitted = await contract.submitAsync('RegisterTraceabilityEvent', {
        arguments: [
          eventEvidence.eventId,
          eventEvidence.codigoLote,
          eventEvidence.tipoEvento,
          eventEvidence.hashEvento,
          eventEvidence.hashAnterior || '',
          eventEvidence.timestamp,
          eventEvidence.responsable
        ]
      });

      const status = await submitted.getStatus();
      await submitted.getResult();

      if (!status.successful) {
        throw new Error(`Transaccion Fabric no valida. Codigo de commit: ${status.code}`);
      }

      return {
        transactionId: submitted.getTransactionId(),
        blockNumber: status.blockNumber ? Number(status.blockNumber) : null,
        successful: status.successful,
        code: status.code
      };
    });
  }

  async getEventFromFabric(eventId) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('GetTraceabilityEvent', eventId);
      return normalizarEventoFabric(result);
    });
  }

  async getEventsByLotFromFabric(codigoLote) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('GetEventsByLot', codigoLote);
      return normalizarEventoFabric(result) || [];
    });
  }

  async eventExists(eventId) {
    return this.usarContrato(async (contract) => {
      const result = await contract.evaluateTransaction('EventExists', eventId);
      return normalizarBooleanFabric(result);
    });
  }

  async verifyEventAgainstFabric(eventId) {
    const event = await this.getEventFromFabric(eventId);
    return { eventId, exists: Boolean(event), event };
  }
}

export const fabricTraceabilityService = new FabricTraceabilityService();
