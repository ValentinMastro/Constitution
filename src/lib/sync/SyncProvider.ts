import type * as Y from 'yjs';

/**
 * Abstraction de transport de synchronisation branchée sur un `Y.Doc`.
 *
 * Permet de changer de mécanisme sans toucher au reste de l'app :
 *  - Phase 0 → 6 : aucun transport réseau (persistance locale `y-indexeddb` seule).
 *  - Phase 7 : `WebrtcSyncProvider` (P2P direct, STUN seul, salon chiffré).
 *  - Repli éventuel : ajout d'un relais TURN auto-hébergé, sans refonte.
 */
export interface SyncProvider {
	readonly connected: boolean;
	connect(): void;
	disconnect(): void;
	destroy(): void;
}

export interface SyncContext {
	doc: Y.Doc;
	/** Identifiant de salon (= id de projet). */
	room: string;
	/** Secret partagé (chiffrement du salon). */
	password: string;
}

/** Transport « néant » : utilisé tant que la collaboration P2P (Phase 7) n'est pas activée. */
export class NullSyncProvider implements SyncProvider {
	readonly connected = false;
	connect(): void {}
	disconnect(): void {}
	destroy(): void {}
}
