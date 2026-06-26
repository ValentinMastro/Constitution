import * as Y from 'yjs';
import { browser } from '$app/environment';
import type { ProjectMeta } from '../types';
import { closeProject, openProject, type ProjectStore } from './project.svelte';
import type { ParsedProjectFile } from '../services/projectFile';

const STORAGE_KEY = 'cc-projects';
const LAST_KEY = 'cc-last-project';

function load(): ProjectMeta[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
	} catch {
		return [];
	}
}

let metas = $state<ProjectMeta[]>(load());

function persist() {
	if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(metas));
}

function randomKey(bytes = 16): string {
	const a = new Uint8Array(bytes);
	crypto.getRandomValues(a);
	return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Registre réactif des projets connus sur ce poste. */
export const registry = {
	get list(): ProjectMeta[] {
		return metas;
	},

	get(id: string): ProjectMeta | undefined {
		return metas.find((m) => m.id === id);
	},

	/** id du dernier projet ouvert (réouverture automatique après rechargement). */
	get lastId(): string | null {
		return browser ? localStorage.getItem(LAST_KEY) : null;
	},

	/** Ouvre un projet existant et le mémorise comme dernier ouvert. */
	open(id: string) {
		const store = openProject(id);
		if (browser) localStorage.setItem(LAST_KEY, id);
		return store;
	},

	close() {
		closeProject();
		if (browser) localStorage.removeItem(LAST_KEY);
	},

	/** Crée un projet, l'enregistre et l'ouvre. */
	create(name: string): ProjectMeta {
		const meta: ProjectMeta = {
			id: crypto.randomUUID(),
			name: name.trim() || 'Projet sans nom',
			shareKey: randomKey(),
			createdAt: Date.now()
		};
		metas = [...metas, meta];
		persist();
		const store = this.open(meta.id);
		store.setEstablishmentName(meta.name);
		return meta;
	},

	rename(id: string, name: string) {
		metas = metas.map((m) => (m.id === id ? { ...m, name: name.trim() || m.name } : m));
		persist();
	},

	remove(id: string) {
		metas = metas.filter((m) => m.id !== id);
		persist();
		this.close();
		// Purge la persistance IndexedDB du projet.
		if (browser && 'indexedDB' in window) indexedDB.deleteDatabase(`cc-project-${id}`);
	},

	/**
	 * Importe un projet depuis un fichier exporté, puis l'ouvre.
	 * - `join` : conserve l'ID/clé d'origine (re-synchronisation P2P possible).
	 * - `copy` : génère un nouvel ID/clé (copie indépendante).
	 *
	 * L'état Yjs du fichier est appliqué au `Y.Doc` du projet ; la fusion CRDT est
	 * commutative, donc sans course critique avec le chargement IndexedDB et sans
	 * réapparition des entités supprimées.
	 */
	importProject(
		parsed: ParsedProjectFile,
		mode: 'join' | 'copy'
	): { meta: ProjectMeta; screen: string } {
		const meta: ProjectMeta =
			mode === 'copy'
				? {
						id: crypto.randomUUID(),
						name: `${parsed.meta.name} (copie)`,
						shareKey: randomKey(),
						createdAt: Date.now()
					}
				: {
						id: parsed.meta.id,
						name: parsed.meta.name,
						shareKey: parsed.meta.shareKey,
						createdAt: parsed.meta.createdAt
					};
		if (!this.get(meta.id)) {
			metas = [...metas, meta];
			persist();
		}
		const store: ProjectStore = this.open(meta.id);
		Y.applyUpdate(store.doc, parsed.update);
		return { meta, screen: parsed.screen };
	},

	/** Code de partage (à transmettre à un autre poste) : id + nom + clé. */
	shareCode(id: string): string {
		const m = this.get(id);
		if (!m) return '';
		const payload = { id: m.id, name: m.name, shareKey: m.shareKey };
		return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
	},

	/**
	 * Enregistre un projet partagé depuis son code (sans données : elles
	 * arriveront par la synchronisation P2P) et l'ouvre.
	 */
	joinShared(code: string): ProjectMeta {
		const json = decodeURIComponent(escape(atob(code.trim())));
		const data = JSON.parse(json) as Pick<ProjectMeta, 'id' | 'name' | 'shareKey'>;
		if (!data.id || !data.shareKey) throw new Error('Code de partage invalide');
		let meta = this.get(data.id);
		if (!meta) {
			meta = { ...data, createdAt: Date.now(), ephemeral: true };
			metas = [...metas, meta];
			persist();
		}
		this.open(data.id);
		return meta;
	}
};
