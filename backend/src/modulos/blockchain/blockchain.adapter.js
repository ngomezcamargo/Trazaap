export class BlockchainAdapter {
  async registrarEvento(hash, evento) {
    console.log(
      `[BlockchainAdapter] Evento preparado para Hyperledger Fabric | tipo=${evento.tipoEvento} | hash=${hash}`
    );

    return {
      estado: 'pendiente_integracion',
      tecnologiaObjetivo: 'Hyperledger Fabric',
      hash
    };
  }
}

export const blockchainAdapter = new BlockchainAdapter();
