import type { ProjectStore } from '../store/project.svelte';
import type { ClassRoom, OptionGroup, OptionItem, OptionKind } from '../types';

function nextOrder<T extends { order: number }>(items: T[]): number {
	return items.reduce((max, i) => Math.max(max, i.order), -1) + 1;
}

export function addGroup(
	store: ProjectStore,
	name: string,
	kind: OptionKind,
	levelId: string | null
): OptionGroup {
	const group: OptionGroup = {
		id: crypto.randomUUID(),
		name: name.trim() || 'Nouveau groupe',
		kind,
		levelId,
		order: nextOrder(store.optionGroups.items)
	};
	store.optionGroups.add(group);
	return group;
}

/** Supprime un groupe, ses options, leurs offres de classe et les retire des élèves. */
export function removeGroup(store: ProjectStore, groupId: string): void {
	store.transact(() => {
		const optionIds = new Set(
			store.options.items.filter((o) => o.groupId === groupId).map((o) => o.id)
		);
		store.classOptions.removeWhere((co) => optionIds.has(co.optionId));
		for (const s of store.students.items) {
			const kept = s.optionIds.filter((id) => !optionIds.has(id));
			if (kept.length !== s.optionIds.length) store.students.update(s.id, { optionIds: kept });
		}
		store.options.removeWhere((o) => o.groupId === groupId);
		store.optionGroups.remove(groupId);
	});
}

export function optionsOf(store: ProjectStore, groupId: string): OptionItem[] {
	return store.options.items
		.filter((o) => o.groupId === groupId)
		.sort((a, b) => a.order - b.order);
}

export function addOption(store: ProjectStore, groupId: string, name: string): OptionItem {
	const siblings = optionsOf(store, groupId);
	const option: OptionItem = {
		id: crypto.randomUUID(),
		groupId,
		name: name.trim() || `Option ${siblings.length + 1}`,
		order: nextOrder(siblings)
	};
	store.options.add(option);
	return option;
}

export function removeOption(store: ProjectStore, optionId: string): void {
	store.transact(() => {
		store.classOptions.removeWhere((co) => co.optionId === optionId);
		for (const s of store.students.items)
			if (s.optionIds.includes(optionId))
				store.students.update(s.id, { optionIds: s.optionIds.filter((id) => id !== optionId) });
		store.options.remove(optionId);
	});
}

export function isOffered(store: ProjectStore, classId: string, optionId: string): boolean {
	return store.classOptions.items.some((co) => co.classId === classId && co.optionId === optionId);
}

export function toggleClassOption(store: ProjectStore, classId: string, optionId: string): void {
	const existing = store.classOptions.items.find(
		(co) => co.classId === classId && co.optionId === optionId
	);
	if (existing) store.classOptions.remove(existing.id);
	else store.classOptions.add({ id: crypto.randomUUID(), classId, optionId });
}

/** Groupes applicables à un niveau (globaux ou restreints à ce niveau). */
export function groupsForLevel(store: ProjectStore, levelId: string): OptionGroup[] {
	return store.optionGroups.items
		.filter((g) => g.levelId === null || g.levelId === levelId)
		.sort((a, b) => a.order - b.order);
}

/** Options applicables à un niveau, à plat (pour les lignes d'une matrice). */
export function optionsForLevel(store: ProjectStore, levelId: string): OptionItem[] {
	const groupIds = new Set(groupsForLevel(store, levelId).map((g) => g.id));
	return store.options.items
		.filter((o) => groupIds.has(o.groupId))
		.sort((a, b) => a.order - b.order);
}

export function classesOfLevel(store: ProjectStore, levelId: string): ClassRoom[] {
	return store.classes.items
		.filter((c) => c.levelId === levelId)
		.sort((a, b) => a.order - b.order);
}

/** Options offertes par une classe, triées comme dans le niveau. */
export function optionsOfClass(store: ProjectStore, classId: string): OptionItem[] {
	const offered = new Set(
		store.classOptions.items.filter((co) => co.classId === classId).map((co) => co.optionId)
	);
	return store.options.items.filter((o) => offered.has(o.id)).sort((a, b) => a.order - b.order);
}

// ── Couleurs d'options ──────────────────────────────────────────────────────
// Palette Tailwind ; une couleur stable par option (hash du nom), partagée par
// les cartes d'élèves et les en-têtes de classes.
// Teintes volontairement éloignées les unes des autres et des couleurs réservées :
// rose/bleu (fond F/G), rouge (problème), émeraude (M), ambre (Z), violet/indigo (🔗).
const OPTION_COLORS = [
	'bg-orange-100 text-orange-700 border-orange-700',
	'bg-teal-100 text-teal-700 border-teal-700',
	'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-700',
	'bg-lime-100 text-lime-700 border-lime-700',
	'bg-purple-100 text-purple-700 border-purple-700',
	'bg-stone-200 text-stone-700 border-stone-700'
];

export function optionColor(name: string): string {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
	return OPTION_COLORS[Math.abs(h) % OPTION_COLORS.length];
}
