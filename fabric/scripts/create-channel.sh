#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export FABRIC_SCRIPT_DIR="${SCRIPT_DIR}"
. "${SCRIPT_DIR}/env.sh"

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

join_peer() {
  peer_name="$1"
  use_peer="$2"

  "${use_peer}"
  wait_for_peer "${peer_name}"

  if ! peer channel join -b "${FABRIC_DIR}/channel-artifacts/${CHANNEL_NAME}.block"; then
    echo "${peer_name} ya puede estar unido al canal ${CHANNEL_NAME}; se continuara."
  fi
}

mkdir -p "${FABRIC_DIR}/channel-artifacts"

configtxgen -profile TrazaapChannel -outputBlock "${FABRIC_DIR}/channel-artifacts/${CHANNEL_NAME}.block" -channelID "${CHANNEL_NAME}"

if ! osnadmin channel join \
  --channelID "${CHANNEL_NAME}" \
  --config-block "${FABRIC_DIR}/channel-artifacts/${CHANNEL_NAME}.block" \
  -o localhost:7053 \
  --ca-file "${ORDERER_CA}" \
  --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
  --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}"; then
  echo "El canal ${CHANNEL_NAME} ya puede existir en el orderer; se continuara con el peer join."
fi

join_peer "peer0.org1.trazaap.local" use_peer0
join_peer "peer1.org1.trazaap.local" use_peer1

echo "Canal ${CHANNEL_NAME} creado y peers unidos"
