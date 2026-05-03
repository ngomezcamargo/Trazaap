import { fabricClient } from './fabric.client.js';

export class BlockchainAdapter {
  async registrarEvento(hash, evento) {
    return fabricClient.registrarEventoEnBlockchain(evento, hash);
  }
}

export const blockchainAdapter = new BlockchainAdapter();
