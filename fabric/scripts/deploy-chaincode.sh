#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/env.sh"

command -v peer >/dev/null 2>&1 || {
  echo "peer no esta instalado o no esta en PATH"
  exit 1
}

mkdir -p "${FABRIC_DIR}/chaincode-packages"

PACKAGE_FILE="${FABRIC_DIR}/chaincode-packages/${CHAINCODE_NAME}.tar.gz"

peer lifecycle chaincode package "${PACKAGE_FILE}" \
  --path "${FABRIC_DIR}/chaincode/traceability" \
  --lang node \
  --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

peer lifecycle chaincode install "${PACKAGE_FILE}"

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
  --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}"

echo "Chaincode ${CHAINCODE_NAME} desplegado en ${CHANNEL_NAME}"
