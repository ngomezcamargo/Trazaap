#!/bin/sh
set -eu

export CHANNEL_NAME="${CHANNEL_NAME:-trazabilidad-channel}"
export CHAINCODE_NAME="${CHAINCODE_NAME:-traceability}"
export CHAINCODE_VERSION="${CHAINCODE_VERSION:-1.0}"
export CHAINCODE_SEQUENCE="${CHAINCODE_SEQUENCE:-1}"

SCRIPT_DIR="${FABRIC_SCRIPT_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}"
export FABRIC_DIR="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
export FABRIC_CFG_PATH="${FABRIC_DIR}/configtx"

if [ -d "${FABRIC_DIR}/bin" ]; then
  export PATH="${FABRIC_DIR}/bin:${PATH}"
fi

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_MSPCONFIGPATH="${FABRIC_DIR}/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="${FABRIC_DIR}/organizations/peerOrganizations/org1.trazaap.local/peers/peer0.org1.trazaap.local/tls/ca.crt"
export CORE_PEER_BCCSP_DEFAULT=SW
export CORE_PEER_BCCSP_SW_HASH=SHA2
export CORE_PEER_BCCSP_SW_SECURITY=256
export CORE_PEER_BCCSP_SW_FILEKEYSTORE_KEYSTORE="${CORE_PEER_MSPCONFIGPATH}/keystore"
export ORDERER_CA="${FABRIC_DIR}/organizations/ordererOrganizations/trazaap.local/orderers/orderer.trazaap.local/tls/ca.crt"
export ORDERER_ADMIN_TLS_SIGN_CERT="${FABRIC_DIR}/organizations/ordererOrganizations/trazaap.local/users/Admin@trazaap.local/tls/client.crt"
export ORDERER_ADMIN_TLS_PRIVATE_KEY="${FABRIC_DIR}/organizations/ordererOrganizations/trazaap.local/users/Admin@trazaap.local/tls/client.key"
