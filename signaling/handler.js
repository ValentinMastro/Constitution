/**
 * Cœur de signalisation y-webrtc, indépendant du transport.
 *
 * Il ne relaie QUE des métadonnées de mise en relation WebRTC (offres/réponses
 * SDP, candidats ICE) regroupées par « topic » (= salon). Aucune donnée élève ne
 * transite ici : une fois la connexion P2P établie, tout passe directement entre
 * pairs, chiffré par le mot de passe de salon.
 *
 * Réutilisé par le serveur autonome (`signaling/server.js`) et par le plugin Vite
 * qui monte la signalisation sur le serveur de dev (même origine que l'app, donc
 * un seul certificat à accepter — indispensable côté mobile).
 */

const PING_TIMEOUT = 30000;

/**
 * @param {import('ws').WebSocket} conn
 * @param {unknown} message
 */
function send(conn, message) {
	if (conn.readyState === 0 || conn.readyState === 1) {
		try {
			conn.send(JSON.stringify(message));
		} catch {
			conn.close();
		}
	}
}

/**
 * Branche la gestion des connexions de signalisation sur un `WebSocketServer`.
 * @param {import('ws').WebSocketServer} wss
 */
export function attachSignaling(wss) {
	/** topic -> Set<WebSocket> */
	const topics = new Map();

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
}
