#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/env.sh"

command -v configtxgen >/dev/null 2>&1 || {
  echo "configtxgen no esta instalado o no esta en PATH"
  exit 1
}
command -v osnadmin >/dev/null 2>&1 || {
  echo "osnadmin no esta instalado o no esta en PATH"
  exit 1
}
command -v peer >/dev/null 2>&1 || {
  echo "peer no esta instalado o no esta en PATH"
  exit 1
}

mkdir -p "${FABRIC_DIR}/channel-artifacts"

configtxgen -profile TrazaapChannel -outputBlock "${FABRIC_DIR}/channel-artifacts/${CHANNEL_NAME}.block" -channelID "${CHANNEL_NAME}"

osnadmin channel join \
  --channelID "${CHANNEL_NAME}" \
  --config-block "${FABRIC_DIR}/channel-artifacts/${CHANNEL_NAME}.block" \
  -o localhost:7053 \
  --ca-file "${ORDERER_CA}" \
  --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
  --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}"

peer channel join -b "${FABRIC_DIR}/channel-artifacts/${CHANNEL_NAME}.block"

echo "Canal ${CHANNEL_NAME} creado y peer unido"
