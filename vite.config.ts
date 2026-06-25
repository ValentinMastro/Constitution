import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';
import { WebSocketServer } from 'ws';
import { attachSignaling } from './signaling/handler.js';

// Plugin de dev : monte la signalisation y-webrtc sur le serveur Vite, au chemin
// `/signaling`. Ainsi la WebSocket de signalisation partage l'origine (et donc le
// certificat) de l'app — un téléphone qui a accepté le cert pour ouvrir le site
// peut se synchroniser sans avoir à accepter un second certificat sur un autre
// port (ce qui est quasi impossible sur mobile pour un port purement WebSocket).
function signalingPlugin(): PluginOption {
	const wss = new WebSocketServer({ noServer: true });
	attachSignaling(wss);
	return {
		name: 'cc-signaling',
		configureServer(server) {
			// On n'intercepte que notre chemin ; Vite garde la main sur sa WS HMR.
			server.httpServer?.on('upgrade', (req, socket, head) => {
				const { pathname } = new URL(req.url ?? '', 'http://localhost');
				if (pathname === '/signaling')
					wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
			});
		}
	};
}

// HTTPS de dev : activé automatiquement si le certificat auto-signé existe
// (généré par `npm run cert`). Requis pour tester la collaboration P2P sur le
// réseau local — `crypto.subtle` n'est dispo qu'en contexte sécurisé.
const keyPath = fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url));
const certPath = fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url));
const https =
	existsSync(keyPath) && existsSync(certPath)
		? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
		: undefined;

export default defineConfig({
	server: { host: true, https },
	plugins: [
		signalingPlugin(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// SPA locale : tout s'exécute côté client, aucune donnée ne transite vers un serveur.
			// `fallback` sert la même page pour toutes les routes (rendu client-side).
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
