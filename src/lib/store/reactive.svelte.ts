import * as Y from 'yjs';

/**
 * Enveloppe réactive (Svelte 5) au-dessus d'un `Y.Map<Y.Map>` keyé par id.
 *
 * Yjs reste la source de vérité ; on maintient un instantané `$state` re-dérivé
 * à chaque modification observée. Pour quelques centaines d'entités, recopier
 * l'instantané est négligeable et garde le code simple et correct.
 */
export class YCollection<T extends { id: string }> {
	#ymap: Y.Map<Y.Map<unknown>>;
	#items = $state<T[]>([]);

	constructor(ymap: Y.Map<Y.Map<unknown>>) {
		this.#ymap = ymap;
		this.#sync();
		this.#ymap.observeDeep(() => this.#sync());
	}

	#sync() {
		const arr: T[] = [];
		this.#ymap.forEach((m) => arr.push(m.toJSON() as T));
		this.#items = arr;
	}

	/** Instantané réactif (lecture). */
	get items(): T[] {
		return this.#items;
	}

	get size(): number {
		return this.#items.length;
	}

	get(id: string): T | undefined {
		return this.#items.find((i) => i.id === id);
	}

	add(value: T): void {
		const m = new Y.Map<unknown>();
		for (const [k, v] of Object.entries(value)) m.set(k, v);
		this.#ymap.set(value.id, m);
	}

	update(id: string, patch: Partial<T>): void {
		const m = this.#ymap.get(id);
		if (!m) return;
		const doc = this.#ymap.doc;
		const apply = () => {
			for (const [k, v] of Object.entries(patch)) m.set(k, v as unknown);
		};
		if (doc) doc.transact(apply);
		else apply();
	}

	remove(id: string): void {
		this.#ymap.delete(id);
	}

	/** Supprime toutes les entités vérifiant le prédicat. */
	removeWhere(pred: (item: T) => boolean): void {
		const doc = this.#ymap.doc;
		const apply = () => {
			for (const item of this.#items) if (pred(item)) this.#ymap.delete(item.id);
		};
		if (doc) doc.transact(apply);
		else apply();
	}
}
