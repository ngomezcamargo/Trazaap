#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/env.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" up -d ca.trazaap.local
echo "Esperando CA..."
sleep 5

"${FABRIC_DIR}/scripts/enroll-identities.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" up -d orderer.trazaap.local peer0.org1.trazaap.local

echo "Red Fabric local iniciada"
