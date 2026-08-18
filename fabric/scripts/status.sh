#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export FABRIC_SCRIPT_DIR="${SCRIPT_DIR}"
. "${SCRIPT_DIR}/env.sh"

echo "Canal: ${CHANNEL_NAME}"
echo "Chaincode: ${CHAINCODE_NAME}"

for peer_number in 0 1; do
  if [ "${peer_number}" = "0" ]; then
    use_peer0
    peer_name="peer0.org1.trazaap.local"
  else
    use_peer1
    peer_name="peer1.org1.trazaap.local"
  fi

  echo "--- ${peer_name} ---"
  peer lifecycle chaincode querycommitted \
    --channelID "${CHANNEL_NAME}" \
    --name "${CHAINCODE_NAME}"
done
