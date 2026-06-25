import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { YCollection } from './reactive.svelte';
import { NullSyncProvider, type SyncProvider } from '../sync/SyncProvider';
import { sync } from '../sync/webrtc.svelte';
import { migrateOptionGroups } from '../domain/options';
import type {
	ClassOption,
	ClassRoom,
	Level,
	OptionGroup,
	OptionItem,
	Student,
	StudentLink
} from '../types';

/**
 * Store d'un projet ouvert : un `Y.Doc` unique (source de vérité) persisté
 * localement via IndexedDB, exposé en collections réactives Svelte.
 */
export class ProjectStore {
	readonly id: string;
	readonly doc: Y.Doc;
	readonly persistence: IndexeddbPersistence;
	/** Transport de sync (NullSyncProvider tant que la Phase 7 n'est pas branchée). */
	sync: SyncProvider = new NullSyncProvider();

	/** true une fois le contenu IndexedDB chargé. */
	loaded = $state(false);

	readonly #establishment: Y.Map<unknown>;
	estName = $state('');

	readonly levels: YCollection<Level>;
	readonly classes: YCollection<ClassRoom>;
	readonly optionGroups: YCollection<OptionGroup>;
	readonly options: YCollection<OptionItem>;
	readonly classOptions: YCollection<ClassOption>;
	readonly students: YCollection<Student>;
	readonly links: YCollection<StudentLink>;

	constructor(id: string) {
		this.id = id;
		this.doc = new Y.Doc();

		this.#establishment = this.doc.getMap('establishment');
		this.levels = new YCollection(this.doc.getMap('levels'));
		this.classes = new YCollection(this.doc.getMap('classes'));
		this.optionGroups = new YCollection(this.doc.getMap('optionGroups'));
		this.options = new YCollection(this.doc.getMap('options'));
		this.classOptions = new YCollection(this.doc.getMap('classOptions'));
		this.students = new YCollection(this.doc.getMap('students'));
		this.links = new YCollection(this.doc.getMap('links'));

		this.#syncEstablishment();
		this.#establishment.observe(() => this.#syncEstablishment());

		this.persistence = new IndexeddbPersistence(`cc-project-${id}`, this.doc);
		this.persistence.once('synced', () => {
			migrateOptionGroups(this);
			this.loaded = true;
		});
	}

	#syncEstablishment() {
		this.estName = (this.#establishment.get('name') as string) ?? '';
	}

	setEstablishmentName(name: string) {
		this.#establishment.set('name', name);
	}

	/** Regroupe plusieurs mutations dans une seule transaction Yjs. */
	transact(fn: () => void) {
		this.doc.transact(fn);
	}

	destroy() {
		this.sync.destroy();
		this.persistence.destroy();
		this.doc.destroy();
	}
}

// ── Singleton du projet courant ──────────────────────────────────────────────

let current = $state<ProjectStore | null>(null);

/** Accès réactif au projet ouvert (null si aucun). */
export const project = {
	get current(): ProjectStore | null {
		return current;
	}
};

export function openProject(id: string): ProjectStore {
	if (current?.id === id) return current;
	sync.disconnect();
	current?.destroy();
	current = new ProjectStore(id);
	return current;
}

export function closeProject() {
	sync.disconnect();
	current?.destroy();
	current = null;
}
