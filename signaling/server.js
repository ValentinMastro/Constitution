#!/usr/bin/env node
/**
 * Serveur de signalisation auto-hébergé pour y-webrtc.
 *
 * Il ne relaie QUE des métadonnées de mise en relation WebRTC (offres/réponses
 * SDP, candidats ICE) regroupées par « topic » (= salon). Aucune donnée élève ne
 * transite ici : une fois la connexion P2P établie, tout passe directement entre
 * pairs, chiffré par le mot de passe de salon.
 *
 * Lancement :  PORT=4444 node signaling/server.js
 */
import { WebSocketServer } from 'ws';
import { createServer as createHttpsServer } from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4444);
const PING_TIMEOUT = 30000;

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

/** topic -> Set<WebSocket> */
const topics = new Map();

function send(conn, message) {
	if (conn.readyState === 0 || conn.readyState === 1) {
		try {
			conn.send(JSON.stringify(message));
		} catch {
			conn.close();
		}
	}
}

wss.on('connection', (conn) => {
	const subscribed = new Set();
	let alive = true;

	const pingInterval = setInterval(() => {
		if (!alive) {
			conn.close();
			clearInterval(pingInterval);
			return;
		}
		alive = false;
		try {
			conn.ping();
		} catch {
			conn.close();
		}
	}, PING_TIMEOUT);

	conn.on('pong', () => (alive = true));

	conn.on('close', () => {
		for (const topic of subscribed) {
			const set = topics.get(topic);
			set?.delete(conn);
			if (set && set.size === 0) topics.delete(topic);
		}
		subscribed.clear();
		clearInterval(pingInterval);
	});

	conn.on('message', (data) => {
		let message;
		try {
			message = JSON.parse(data.toString());
		} catch {
			return;
		}
		if (!message || !message.type) return;
		if (process.env.DEBUG)
			console.log(`[sig] ${message.type}`, message.topics || message.topic || '');

		switch (message.type) {
			case 'subscribe':
				for (const topic of message.topics || []) {
					if (typeof topic !== 'string') continue;
					let set = topics.get(topic);
					if (!set) topics.set(topic, (set = new Set()));
					set.add(conn);
					subscribed.add(topic);
				}
				break;
			case 'unsubscribe':
				for (const topic of message.topics || []) {
					topics.get(topic)?.delete(conn);
					subscribed.delete(topic);
				}
				break;
			case 'publish':
				if (message.topic) {
					const receivers = topics.get(message.topic);
					if (receivers) for (const receiver of receivers) send(receiver, message);
				}
				break;
			case 'ping':
				send(conn, { type: 'pong' });
				break;
		}
	});
});

console.log(
	`[signaling] y-webrtc signaling server en écoute sur ${tls ? 'wss' : 'ws'}://localhost:${PORT}`
);
