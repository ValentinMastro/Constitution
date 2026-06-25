import type { ProjectStore } from '../store/project.svelte';
import type { LinkType, Student, StudentLink } from '../types';
import { groupsForLevel, optionsOf } from './options';

export function studentLabel(s: Student): string {
	return `${s.lastName} ${s.firstName}`.trim() || '(sans nom)';
}

export function addStudent(store: ProjectStore, levelId: string): Student {
	const s: Student = {
		id: crypto.randomUUID(),
		levelId,
		lastName: '',
		firstName: '',
		sex: '',
		academic: '',
		moteur: '',
		perturbateur: '',
		originClass: '',
		optionIds: [],
		assignedClassId: null
	};
	store.students.add(s);
	return s;
}

export function removeStudent(store: ProjectStore, studentId: string): void {
	store.transact(() => {
		store.links.removeWhere((l) => l.a === studentId || l.b === studentId);
		store.students.remove(studentId);
	});
}

// ── Options de l'élève ────────────────────────────────────────────────────────

export function applicableOptions(store: ProjectStore, levelId: string) {
	return groupsForLevel(store, levelId).map((g) => ({ group: g, options: optionsOf(store, g.id) }));
}

export function toggleStudentOption(store: ProjectStore, student: Student, optionId: string): void {
	const has = student.optionIds.includes(optionId);
	const next = has
		? student.optionIds.filter((id) => id !== optionId)
		: [...student.optionIds, optionId];
	store.students.update(student.id, { optionIds: next });
}

/** Pour un groupe « choix » (exclusif), sélectionne une seule option. */
export function setChoiceOption(
	store: ProjectStore,
	student: Student,
	groupId: string,
	optionId: string | null
): void {
	const groupOptionIds = new Set(optionsOf(store, groupId).map((o) => o.id));
	const kept = student.optionIds.filter((id) => !groupOptionIds.has(id));
	if (optionId) kept.push(optionId);
	store.students.update(student.id, { optionIds: kept });
}

export function optionNames(store: ProjectStore, student: Student): string[] {
	return student.optionIds.map((id) => store.options.get(id)?.name ?? '?').filter(Boolean);
}

// ── Liens entre élèves ────────────────────────────────────────────────────────

export function linksOf(store: ProjectStore, studentId: string): StudentLink[] {
	return store.links.items.filter((l) => l.a === studentId || l.b === studentId);
}

export function partnersOf(store: ProjectStore, studentId: string, type: LinkType): string[] {
	return store.links.items
		.filter((l) => l.type === type && (l.a === studentId || l.b === studentId))
		.map((l) => (l.a === studentId ? l.b : l.a));
}

export function hasLink(store: ProjectStore, a: string, b: string): StudentLink | undefined {
	return store.links.items.find(
		(l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)
	);
}

/** Ajoute un lien symétrique ; remplace un éventuel lien existant de type opposé. */
export function addLink(store: ProjectStore, a: string, b: string, type: LinkType): void {
	if (a === b) return;
	store.transact(() => {
		const existing = hasLink(store, a, b);
		if (existing) {
			if (existing.type === type) return; // déjà présent
			store.links.remove(existing.id); // bascule with <-> apart
		}
		store.links.add({ id: crypto.randomUUID(), type, a, b });
	});
}

export function removeLink(store: ProjectStore, linkId: string): void {
	store.links.remove(linkId);
}
