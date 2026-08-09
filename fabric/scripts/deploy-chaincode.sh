#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export FABRIC_SCRIPT_DIR="${SCRIPT_DIR}"
. "${SCRIPT_DIR}/env.sh"

command -v peer >/dev/null 2>&1 || {
  echo "peer no esta instalado o no esta en PATH"
  exit 1
}

wait_for_peer() {
  peer_name="$1"
  attempt=1
  while [ "${attempt}" -le 30 ]; do
    if peer node status >/dev/null 2>&1; then
      return 0
    fi
    echo "Esperando ${peer_name} en ${CORE_PEER_ADDRESS}... intento ${attempt}/30"
    sleep 2
    attempt=$((attempt + 1))
  done

  echo "${peer_name} no respondio en ${CORE_PEER_ADDRESS}. Revisa: docker logs ${peer_name} --tail 100"
  return 1
}

install_chaincode_on_peer() {
  peer_name="$1"
  use_peer="$2"

  "${use_peer}"
  wait_for_peer "${peer_name}"

  if ! peer lifecycle chaincode install "${PACKAGE_FILE}"; then
    echo "${CHAINCODE_NAME} ya puede estar instalado en ${peer_name}; se continuara."
  fi
}

mkdir -p "${FABRIC_DIR}/chaincode-packages"

PACKAGE_FILE="${FABRIC_DIR}/chaincode-packages/${CHAINCODE_NAME}.tar.gz"

peer lifecycle chaincode package "${PACKAGE_FILE}" \
  --path "${FABRIC_DIR}/chaincode/traceability" \
  --lang node \
  --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

install_chaincode_on_peer "peer0.org1.trazaap.local" use_peer0
install_chaincode_on_peer "peer1.org1.trazaap.local" use_peer1

use_peer0

PACKAGE_ID="$(peer lifecycle chaincode queryinstalled | sed -n "s/^Package ID: \\(${CHAINCODE_NAME}_${CHAINCODE_VERSION}:[^,]*\\), Label:.*/\\1/p" | head -n 1)"

if [ -z "${PACKAGE_ID}" ]; then
  echo "No se pudo resolver PACKAGE_ID de ${CHAINCODE_NAME}"
  exit 1
fi

peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.trazaap.local \
  --tls \
  --cafile "${ORDERER_CA}" \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --package-id "${PACKAGE_ID}" \
  --sequence "${CHAINCODE_SEQUENCE}"

peer lifecycle chaincode checkcommitreadiness \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --sequence "${CHAINCODE_SEQUENCE}" \
  --output json

peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.trazaap.local \
  --tls \
  --cafile "${ORDERER_CA}" \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --sequence "${CHAINCODE_SEQUENCE}" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${FABRIC_DIR}/organizations/peerOrganizations/org1.trazaap.local/peers/peer0.org1.trazaap.local/tls/ca.crt" \
  --peerAddresses localhost:8051 \
  --tlsRootCertFiles "${FABRIC_DIR}/organizations/peerOrganizations/org1.trazaap.local/peers/peer1.org1.trazaap.local/tls/ca.crt"

echo "Chaincode ${CHAINCODE_NAME} desplegado en ${CHANNEL_NAME}"
