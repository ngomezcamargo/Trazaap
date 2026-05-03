import crypto from 'crypto';

export function generarHashSha256(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
