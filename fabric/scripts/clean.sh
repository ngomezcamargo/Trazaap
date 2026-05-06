#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/env.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" down -v --remove-orphans

if ! rm -rf "${FABRIC_DIR}/organizations" "${FABRIC_DIR}/channel-artifacts" "${FABRIC_DIR}/chaincode-packages" "${FABRIC_DIR}/fabric-ca" 2>/dev/null; then
  echo "Algunos artefactos Fabric pertenecen a root; limpiando mediante contenedor Docker..."
  docker run --rm \
    -v "${FABRIC_DIR}:/fabric-cleanup" \
    --entrypoint sh \
    hyperledger/fabric-ca:1.5 \
    -c 'rm -rf /fabric-cleanup/organizations /fabric-cleanup/channel-artifacts /fabric-cleanup/chaincode-packages /fabric-cleanup/fabric-ca'
fi

echo "Artefactos y volumenes Fabric de desarrollo eliminados"
