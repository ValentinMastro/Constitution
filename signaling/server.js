#!/usr/bin/env node
/**
 * Serveur de signalisation autonome pour y-webrtc (utile en production ou pour
 * un déploiement séparé du serveur web). En développement, la signalisation est
 * aussi montée directement sur le serveur Vite (voir le plugin dans
 * `vite.config.ts`), ce qui évite d'accepter un second certificat côté mobile.
 *
 * La logique de relais est partagée dans `signaling/handler.js`.
 *
 * Lancement :  PORT=4444 node signaling/server.js
 */
import { WebSocketServer } from 'ws';
import { createServer as createHttpsServer } from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { attachSignaling } from './handler.js';

const PORT = Number(process.env.PORT || 4444);

// TLS (wss://) automatique si le certificat de dev existe (`npm run cert`).
// Une page servie en HTTPS ne peut pas ouvrir de WebSocket `ws://` (mixed
// content), donc on s'aligne sur le mode HTTPS du serveur Vite.
const keyPath = fileURLToPath(new URL('../certs/dev-key.pem', import.meta.url));
const certPath = fileURLToPath(new URL('../certs/dev-cert.pem', import.meta.url));
const tls = existsSync(keyPath) && existsSync(certPath);

let wss;
if (tls) {
	const httpsServer = createHttpsServer({
		key: readFileSync(keyPath),
		cert: readFileSync(certPath)
	});
	httpsServer.listen(PORT);
	wss = new WebSocketServer({ server: httpsServer });
} else {
	wss = new WebSocketServer({ port: PORT });
}

attachSignaling(wss);

console.log(
	`[signaling] y-webrtc signaling server en écoute sur ${tls ? 'wss' : 'ws'}://localhost:${PORT}`
);
