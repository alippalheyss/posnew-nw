import crypto from 'crypto';
import fs from 'fs';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Since node doesn't easily create x509 self-signed certs without forge, 
// let's just use openSSL via child_process if available.
import { execSync } from 'child_process';
try {
  execSync('openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes -subj "/CN=localhost"');
  const key = fs.readFileSync('key.pem', 'utf8');
  const cert = fs.readFileSync('cert.pem', 'utf8');
  
  const tsContent = `export const QZ_CERT = \`${cert}\`;\nexport const QZ_PRIVATE_KEY = \`${key}\`;\n`;
  fs.writeFileSync('src/utils/qzCerts.ts', tsContent);
  
  // cleanup
  fs.unlinkSync('key.pem');
  fs.unlinkSync('cert.pem');
  console.log("Certificate generated in src/utils/qzCerts.ts");
} catch (e) {
  console.error("Failed to generate cert via openssl", e);
}
