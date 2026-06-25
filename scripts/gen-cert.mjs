#!/usr/bin/env node
/**
 * Génère un certificat TLS auto-signé pour le développement HTTPS/WSS local.
 *
 * Le certificat couvre `localhost`, `127.0.0.1` et toutes les adresses IPv4 du
 * réseau local détectées, afin de pouvoir tester la collaboration P2P entre un
 * ordinateur et un téléphone sur le même Wi-Fi (Web Crypto `crypto.subtle`
 * n'est disponible qu'en contexte sécurisé, donc en HTTPS).
 *
 * Sortie : certs/dev-key.pem + certs/dev-cert.pem
 * Usage  : npm run cert
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'certs');
mkdirSync(dir, { recursive: true });

const key = join(dir, 'dev-key.pem');
const cert = join(dir, 'dev-cert.pem');

const ips = ['127.0.0.1'];
for (const list of Object.values(networkInterfaces()))
	for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) ips.push(i.address);

const san = ['DNS:localhost', ...ips.map((ip) => `IP:${ip}`)].join(',');

if (existsSync(key) && existsSync(cert) && !process.argv.includes('--force')) {
	console.log('Certificat déjà présent (certs/). Utilisez --force pour le régénérer.');
	console.log('SAN couvert au moment de la génération initiale.');
	process.exit(0);
}

execFileSync(
	'openssl',
	[
		'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
		'-keyout', key, '-out', cert, '-days', '825',
		'-subj', '/CN=Constitution_Classes Dev',
		'-addext', `subjectAltName=${san}`
	],
	{ stdio: 'inherit' }
);

console.log('\n✓ Certificat généré dans certs/');
console.log('  SAN :', san);
console.log('\nÀ faire ensuite :');
console.log('  1. npm run dev -- --host        (sert en https://<IP>:5173)');
console.log('  2. npm run signaling            (sert en wss://<IP>:4444)');
console.log('  3. Sur CHAQUE appareil, ouvrir une fois https://<IP>:5173 ET');
console.log('     https://<IP>:4444 pour accepter le certificat auto-signé.');
