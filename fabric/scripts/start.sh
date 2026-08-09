#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export FABRIC_SCRIPT_DIR="${SCRIPT_DIR}"
. "${SCRIPT_DIR}/env.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" up -d ca.trazaap.local
echo "Esperando CA..."

attempt=1
while [ "${attempt}" -le 20 ]; do
  if [ -f "${FABRIC_DIR}/fabric-ca/tls-cert.pem" ] && fabric-ca-client getcainfo -u https://localhost:7054 --caname ca-trazaap --tls.certfiles "${FABRIC_DIR}/fabric-ca/tls-cert.pem" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  attempt=$((attempt + 1))
done

if [ ! -f "${FABRIC_DIR}/fabric-ca/tls-cert.pem" ] || ! fabric-ca-client getcainfo -u https://localhost:7054 --caname ca-trazaap --tls.certfiles "${FABRIC_DIR}/fabric-ca/tls-cert.pem" >/dev/null 2>&1; then
  echo "La CA no estuvo lista a tiempo"
  docker logs ca.trazaap.local --tail 80 || true
  exit 1
fi

"${FABRIC_DIR}/scripts/enroll-identities.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" up -d orderer.trazaap.local peer0.org1.trazaap.local peer1.org1.trazaap.local

echo "Red Fabric local iniciada"
