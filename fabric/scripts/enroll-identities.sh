#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export FABRIC_SCRIPT_DIR="${SCRIPT_DIR}"
. "${SCRIPT_DIR}/env.sh"

command -v fabric-ca-client >/dev/null 2>&1 || {
  echo "fabric-ca-client no esta instalado o no esta en PATH"
  exit 1
}

CA_URL="https://localhost:7054"
CA_CERT="${FABRIC_DIR}/fabric-ca/tls-cert.pem"

mkdir -p "${FABRIC_DIR}/organizations/peerOrganizations/org1.trazaap.local"
mkdir -p "${FABRIC_DIR}/organizations/ordererOrganizations/trazaap.local"

write_nodeous() {
  target="$1"
  ca_cert="$2"
  cat > "${target}/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/${ca_cert}
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/${ca_cert}
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/${ca_cert}
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/${ca_cert}
    OrganizationalUnitIdentifier: orderer
EOF
}

copy_tls_ca_to_org_msp() {
  org_home="$1"
  tls_ca="$2"
  output_name="$3"

  mkdir -p "${org_home}/msp/tlscacerts"
  cp "${tls_ca}" "${org_home}/msp/tlscacerts/${output_name}"
}

reset_identity_dir() {
  target="$1"
  rm -rf "${target}"
  mkdir -p "${target}"
}

enroll_org1() {
  export FABRIC_CA_CLIENT_HOME="${FABRIC_DIR}/organizations/peerOrganizations/org1.trazaap.local"
  fabric-ca-client enroll -u "https://admin:adminpw@localhost:7054" --caname ca-trazaap --tls.certfiles "${CA_CERT}"

  ca_cert=''
  ca_cert="$(basename "$(find "${FABRIC_CA_CLIENT_HOME}/msp/cacerts" -type f | head -n 1)")"
  write_nodeous "${FABRIC_CA_CLIENT_HOME}/msp" "${ca_cert}"

  fabric-ca-client register --caname ca-trazaap --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles "${CA_CERT}" || true
  fabric-ca-client register --caname ca-trazaap --id.name user1 --id.secret user1pw --id.type client --tls.certfiles "${CA_CERT}" || true
  fabric-ca-client register --caname ca-trazaap --id.name org1admin --id.secret org1adminpw --id.type admin --tls.certfiles "${CA_CERT}" || true

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/msp"
  fabric-ca-client enroll -u "https://peer0:peer0pw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/msp" --csr.hosts peer0.org1.trazaap.local --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/msp/config.yaml"

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls"
  fabric-ca-client enroll -u "https://peer0:peer0pw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls" --enrollment.profile tls \
    --csr.hosts peer0.org1.trazaap.local --csr.hosts localhost --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/tlscacerts/"* "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/ca.crt"
  cp "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/signcerts/"* "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/server.crt"
  cp "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/keystore/"* "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/server.key"
  copy_tls_ca_to_org_msp "${FABRIC_CA_CLIENT_HOME}" "${FABRIC_CA_CLIENT_HOME}/peers/peer0.org1.trazaap.local/tls/ca.crt" "tlsca.org1.trazaap.local-cert.pem"

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/users/User1@org1.trazaap.local/msp"
  fabric-ca-client enroll -u "https://user1:user1pw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/users/User1@org1.trazaap.local/msp" --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" "${FABRIC_CA_CLIENT_HOME}/users/User1@org1.trazaap.local/msp/config.yaml"

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/users/Admin@org1.trazaap.local/msp"
  fabric-ca-client enroll -u "https://org1admin:org1adminpw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/users/Admin@org1.trazaap.local/msp" --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" "${FABRIC_CA_CLIENT_HOME}/users/Admin@org1.trazaap.local/msp/config.yaml"
  cp "${FABRIC_CA_CLIENT_HOME}/users/Admin@org1.trazaap.local/msp/keystore/"* "${FABRIC_CA_CLIENT_HOME}/users/Admin@org1.trazaap.local/msp/keystore/priv_sk"
}

enroll_orderer() {
  export FABRIC_CA_CLIENT_HOME="${FABRIC_DIR}/organizations/ordererOrganizations/trazaap.local"
  fabric-ca-client enroll -u "https://admin:adminpw@localhost:7054" --caname ca-trazaap --tls.certfiles "${CA_CERT}"

  ca_cert=''
  ca_cert="$(basename "$(find "${FABRIC_CA_CLIENT_HOME}/msp/cacerts" -type f | head -n 1)")"
  write_nodeous "${FABRIC_CA_CLIENT_HOME}/msp" "${ca_cert}"

  fabric-ca-client register --caname ca-trazaap --id.name orderer --id.secret ordererpw --id.type orderer --tls.certfiles "${CA_CERT}" || true
  fabric-ca-client register --caname ca-trazaap --id.name ordereradmin --id.secret ordereradminpw --id.type admin --tls.certfiles "${CA_CERT}" || true

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/msp"
  fabric-ca-client enroll -u "https://orderer:ordererpw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/msp" --csr.hosts orderer.trazaap.local --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/msp/config.yaml"

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls"
  fabric-ca-client enroll -u "https://orderer:ordererpw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls" --enrollment.profile tls \
    --csr.hosts orderer.trazaap.local --csr.hosts localhost --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/tlscacerts/"* "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/ca.crt"
  cp "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/signcerts/"* "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/server.crt"
  cp "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/keystore/"* "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/server.key"
  copy_tls_ca_to_org_msp "${FABRIC_CA_CLIENT_HOME}" "${FABRIC_CA_CLIENT_HOME}/orderers/orderer.trazaap.local/tls/ca.crt" "tlsca.trazaap.local-cert.pem"

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/msp"
  fabric-ca-client enroll -u "https://ordereradmin:ordereradminpw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/msp" --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/msp/config.yaml"

  reset_identity_dir "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/tls"
  fabric-ca-client enroll -u "https://ordereradmin:ordereradminpw@localhost:7054" --caname ca-trazaap \
    -M "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/tls" --enrollment.profile tls \
    --csr.hosts localhost --tls.certfiles "${CA_CERT}"
  cp "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/tls/signcerts/"* "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/tls/client.crt"
  cp "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/tls/keystore/"* "${FABRIC_CA_CLIENT_HOME}/users/Admin@trazaap.local/tls/client.key"
}

enroll_org1
enroll_orderer

echo "Identidades Fabric generadas en ${FABRIC_DIR}/organizations"
