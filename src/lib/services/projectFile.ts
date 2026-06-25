import * as Y from 'yjs';
import type { ProjectMeta } from '../types';
import type { ProjectStore } from '../store/project.svelte';
import { downloadBlob, safeFileName } from './download';

const FORMAT = 'constitution-classes';
const VERSION = 1;

/** Métadonnées de projet embarquées dans le fichier d'export. */
type FileMeta = Pick<ProjectMeta, 'id' | 'name' | 'shareKey' | 'createdAt'>;

interface ProjectFile {
	format: typeof FORMAT;
	version: number;
	exportedAt: number;
	meta: FileMeta;
	/** Écran (pathname) sur lequel on était au moment de l'export. */
	screen: string;
	/** État binaire Yjs complet (Y.encodeStateAsUpdate), encodé en base64. */
	doc: string;
}

/** Résultat de la lecture d'un fichier projet, prêt à être importé. */
export interface ParsedProjectFile {
	meta: FileMeta;
	screen: string;
	update: Uint8Array;
}

function toBase64(bytes: Uint8Array): string {
	let s = '';
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
	const s = atob(b64);
	const bytes = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
	return bytes;
}

/**
 * Exporte l'intégralité d'un projet (structure, options, élèves, résultats) dans
 * un fichier `.constitution.json`, accompagné du nom, de l'ID/clé de partage et de
 * l'écran courant. L'état Yjs binaire est embarqué tel quel pour préserver la
 * lignée CRDT (fusion correcte lors d'une réimportation « Rejoindre »).
 */
export function serializeProject(store: ProjectStore, meta: ProjectMeta, screen: string): string {
	const data: ProjectFile = {
		format: FORMAT,
		version: VERSION,
		exportedAt: Date.now(),
		meta: { id: meta.id, name: meta.name, shareKey: meta.shareKey, createdAt: meta.createdAt },
		screen,
		doc: toBase64(Y.encodeStateAsUpdate(store.doc))
	};
	return JSON.stringify(data);
}

export function exportProjectFile(store: ProjectStore, meta: ProjectMeta, screen: string): void {
	const blob = new Blob([serializeProject(store, meta, screen)], { type: 'application/json' });
	downloadBlob(`${safeFileName(meta.name)}.constitution.json`, blob);
}

/** Lit et valide un fichier projet exporté. Lève une erreur lisible si invalide. */
export async function readProjectFile(file: File): Promise<ParsedProjectFile> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new Error('Fichier illisible (JSON invalide).');
	}
	const data = parsed as Partial<ProjectFile>;
	if (data?.format !== FORMAT || typeof data.doc !== 'string' || !data.meta?.id) {
		throw new Error('Ce fichier n’est pas un projet exporté valide.');
	}
	if ((data.version ?? 0) > VERSION) {
		throw new Error('Fichier créé par une version plus récente de l’application.');
	}
	return {
		meta: {
			id: data.meta.id,
			name: data.meta.name ?? 'Projet importé',
			shareKey: data.meta.shareKey ?? '',
			createdAt: data.meta.createdAt ?? Date.now()
		},
		screen: data.screen || '/structure/',
		update: fromBase64(data.doc)
	};
}
