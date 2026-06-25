import { browser } from '$app/environment';
import type { WebrtcProvider } from 'y-webrtc';
import type { ProjectStore } from '../store/project.svelte';

const SIGNALING_KEY = 'cc-signaling-url';

/**
 * Serveur de signalisation par défaut. En contexte HTTPS, on impose `wss://`
 * (une page sécurisée ne peut pas ouvrir de WebSocket `ws://` : mixed content).
 */
function defaultSignaling(): string {
	const scheme = browser && location.protocol === 'https:' ? 'wss' : 'ws';
	return `${scheme}://localhost:4444`;
}

/**
 * Configuration ICE — STUN UNIQUEMENT (P2P direct strict, pas de relais TURN).
 * Pour activer le repli, ajouter ici une entrée TURN auto-hébergée :
 *   { urls: 'turn:mon-serveur:3478', username: '…', credential: '…' }
 */
const ICE_SERVERS = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' }
];

export type SyncStatus = 'off' | 'connecting' | 'connected';

/**
 * Polyfills runtime minimaux requis par simple-peer (dépendance de y-webrtc) :
 * `Buffer`, `global` et `process`. Chargés à la demande, côté client uniquement,
 * juste avant l'import de y-webrtc — on évite ainsi tout impact sur le build SSR.
 */
let globalsReady = false;
async function ensureWebrtcGlobals() {
	if (globalsReady) return;
	const g = globalThis as Record<string, unknown>;
	g.global ??= globalThis;
	if (!g.Buffer) {
		const { Buffer } = await import('buffer');
		g.Buffer = Buffer;
	}
	g.process ??= {
		env: {},
		nextTick: (fn: (...a: unknown[]) => void, ...args: unknown[]) =>
			queueMicrotask(() => fn(...args))
	};
	globalsReady = true;
}

/**
 * Contrôle la synchronisation temps réel P2P du projet courant via y-webrtc.
 * Le `Y.Doc` est l'unique source de vérité ; ce contrôleur ne fait que le
 * transporter, chiffré, entre les pairs d'un même salon (id de projet + clé).
 */
class SyncController {
	#provider: WebrtcProvider | null = null;

	status = $state<SyncStatus>('off');
	peers = $state(0);
	error = $state('');
	signalingUrl = $state(
		browser ? (localStorage.getItem(SIGNALING_KEY) ?? defaultSignaling()) : defaultSignaling()
	);

	get active(): boolean {
		return this.#provider !== null;
	}

	/** L'utilisateur a-t-il activé la collaboration pour ce projet ? (persistant) */
	isEnabled(id: string): boolean {
		return browser && localStorage.getItem(`cc-sync-${id}`) === '1';
	}

	rememberEnabled(id: string, on: boolean) {
		if (!browser) return;
		if (on) localStorage.setItem(`cc-sync-${id}`, '1');
		else localStorage.removeItem(`cc-sync-${id}`);
	}

	setSignaling(url: string) {
		this.signalingUrl = url.trim() || defaultSignaling();
		if (browser) localStorage.setItem(SIGNALING_KEY, this.signalingUrl);
	}

	async connect(store: ProjectStore, shareKey: string) {
		this.disconnect();
		this.error = '';
		this.status = 'connecting';
		try {
			await ensureWebrtcGlobals();
			const { WebrtcProvider } = await import('y-webrtc');
			const provider = new WebrtcProvider(`cc-${store.id}`, store.doc, {
				signaling: [this.signalingUrl],
				password: shareKey,
				peerOpts: { config: { iceServers: ICE_SERVERS } }
			} as ConstructorParameters<typeof WebrtcProvider>[2]);

			// État de présence local (permet aux autres pairs de nous détecter).
			provider.awareness.setLocalStateField('user', { since: Date.now() });

			provider.on('status', ({ connected }: { connected: boolean }) => {
				this.status = connected ? 'connected' : 'connecting';
			});
			provider.on('peers', () => this.#refresh(provider));
			provider.awareness.on('change', () => this.#refresh(provider));

			this.#provider = provider;
			this.rememberEnabled(store.id, true);
			if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__ccProvider = provider;
			this.#refresh(provider);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Connexion impossible';
			this.status = 'off';
		}
	}

	#refresh(provider: WebrtcProvider) {
		// Nombre de pairs réellement connectés en P2P.
		let count = 0;
		for (const conn of provider.room?.webrtcConns.values() ?? [])
			if ((conn as { peer?: { connected?: boolean } }).peer?.connected) count++;
		// Repli via awareness si l'info de connexion n'est pas disponible.
		this.peers = Math.max(count, provider.awareness.getStates().size - 1, 0);
		if (this.status !== 'connected' && provider.connected) this.status = 'connected';
	}

	disconnect() {
		this.#provider?.destroy();
		this.#provider = null;
		this.status = 'off';
		this.peers = 0;
	}
}

export const sync = new SyncController();
