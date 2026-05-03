export class FabricClient {
  async registrarEventoEnBlockchain(evento, hash) {
    return {
      estado: 'pendiente_integracion_fabric',
      tecnologia: 'Hyperledger Fabric',
      hash,
      evento
    };
  }

  async consultarEventoBlockchain(hash) {
    return {
      estado: 'pendiente_integracion_fabric',
      tecnologia: 'Hyperledger Fabric',
      hash
    };
  }
}

export const fabricClient = new FabricClient();
