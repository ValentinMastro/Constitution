import type { ProjectStore } from '../store/project.svelte';
import type { ClassRoom, Level } from '../types';

export const DEFAULT_CAPACITY = 30;

/** Schémas de nommage proposés pour générer rapidement des classes. */
export type NamingScheme = 'letters' | 'numbers';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function classNameFor(scheme: NamingScheme, index: number): string {
	return scheme === 'letters' ? (LETTERS[index] ?? `C${index + 1}`) : String(index + 1);
}

function nextOrder<T extends { order: number }>(items: T[]): number {
	return items.reduce((max, i) => Math.max(max, i.order), -1) + 1;
}

export function addLevel(store: ProjectStore, name: string): Level {
	const level: Level = {
		id: crypto.randomUUID(),
		name: name.trim() || `Niveau ${store.levels.size + 1}`,
		order: nextOrder(store.levels.items)
	};
	store.levels.add(level);
	return level;
}

/** Supprime un niveau et, en cascade, ses classes, leurs options offertes et ses élèves. */
export function removeLevel(store: ProjectStore, levelId: string): void {
	store.transact(() => {
		const classIds = new Set(
			store.classes.items.filter((c) => c.levelId === levelId).map((c) => c.id)
		);
		store.classOptions.removeWhere((co) => classIds.has(co.classId));
		store.classes.removeWhere((c) => c.levelId === levelId);
		store.students.removeWhere((s) => s.levelId === levelId);
		store.optionGroups.removeWhere((g) => g.levelId === levelId);
		store.levels.remove(levelId);
	});
}

/** Déplace un niveau dans l'ordre (échange les `order` avec le voisin). */
export function moveLevel(store: ProjectStore, levelId: string, dir: -1 | 1): void {
	const sorted = [...store.levels.items].sort((a, b) => a.order - b.order);
	const i = sorted.findIndex((l) => l.id === levelId);
	const j = i + dir;
	if (i < 0 || j < 0 || j >= sorted.length) return;
	store.transact(() => {
		store.levels.update(sorted[i].id, { order: sorted[j].order });
		store.levels.update(sorted[j].id, { order: sorted[i].order });
	});
}

export function classesOf(store: ProjectStore, levelId: string): ClassRoom[] {
	return store.classes.items
		.filter((c) => c.levelId === levelId)
		.sort((a, b) => a.order - b.order);
}

export function addClass(store: ProjectStore, levelId: string, name: string): ClassRoom {
	const siblings = classesOf(store, levelId);
	const cls: ClassRoom = {
		id: crypto.randomUUID(),
		levelId,
		name: name.trim() || classNameFor('letters', siblings.length),
		capacity: DEFAULT_CAPACITY,
		order: nextOrder(siblings)
	};
	store.classes.add(cls);
	return cls;
}

/** (Re)génère `count` classes pour un niveau selon un schéma de nommage. */
export function generateClasses(
	store: ProjectStore,
	levelId: string,
	count: number,
	scheme: NamingScheme
): void {
	store.transact(() => {
		store.classOptions.removeWhere((co) => {
			const cls = store.classes.get(co.classId);
			return cls?.levelId === levelId;
		});
		store.classes.removeWhere((c) => c.levelId === levelId);
		for (let i = 0; i < count; i++) {
			store.classes.add({
				id: crypto.randomUUID(),
				levelId,
				name: classNameFor(scheme, i),
				capacity: DEFAULT_CAPACITY,
				order: i
			});
		}
	});
}

export function removeClass(store: ProjectStore, classId: string): void {
	store.transact(() => {
		store.classOptions.removeWhere((co) => co.classId === classId);
		// Les élèves placés dans cette classe redeviennent non affectés.
		for (const s of store.students.items)
			if (s.assignedClassId === classId) store.students.update(s.id, { assignedClassId: null });
		store.classes.remove(classId);
	});
}
