import dotenv from 'dotenv';

dotenv.config();

const requeridas = [
  'PORT',
  'JWT_SECRET',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD'
];

for (const clave of requeridas) {
  if (!process.env[clave]) {
    throw new Error(`Variable de entorno requerida: ${clave}`);
  }
}

export const entorno = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  apiPrefix: process.env.API_PREFIX || '/api',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  postgres: {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  },
  fabric: {
    enabled: process.env.FABRIC_ENABLED !== 'false',
    mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
    channelName: process.env.FABRIC_CHANNEL_NAME || 'trazaapchannel',
    chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'trazaap',
    peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
    peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.trazaap.local',
    tlsCertPath: process.env.FABRIC_TLS_CERT_PATH || '../fabric/organizations/peerOrganizations/org1.trazaap.local/peers/peer0.org1.trazaap.local/tls/ca.crt',
    certPath: process.env.FABRIC_CERT_PATH || '../fabric/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp/signcerts/cert.pem',
    keyPath: process.env.FABRIC_KEY_PATH || '../fabric/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp/keystore/priv_sk'
  },
  minio: {
    enabled: process.env.MINIO_ENABLED === 'true',
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    bucketDocumentos: process.env.MINIO_DOCUMENTS_BUCKET || 'trazaap-documentos',
    maxUploadBytes: Number(process.env.MINIO_MAX_UPLOAD_BYTES) || 10 * 1024 * 1024
  }
};
