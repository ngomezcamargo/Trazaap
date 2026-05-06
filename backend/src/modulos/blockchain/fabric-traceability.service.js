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

    const tlsRootCert = await fs.readFile(this.config.tlsCertPath);
    const client = new grpc.Client(this.config.peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {
      'grpc.ssl_target_name_override': this.config.peerHostAlias
    });

    const cert = await fs.readFile(this.config.certPath);
    const privateKeyPem = await fs.readFile(this.config.keyPath);
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
    const { gateway, client } = await this.crearGateway();
    try {
      const network = gateway.getNetwork(this.config.channelName);
      const contract = network.getContract(this.config.chaincodeName);
      return await callback(contract);
    } finally {
      gateway.close();
      client.close();
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

  async verifyEventAgainstFabric(eventId) {
    const event = await this.getEventFromFabric(eventId);
    return { eventId, exists: Boolean(event), event };
  }
}

export const fabricTraceabilityService = new FabricTraceabilityService();
