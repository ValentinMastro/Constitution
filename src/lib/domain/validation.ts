import type { ProjectStore } from '../store/project.svelte';
import type { Student } from '../types';
import { isOffered } from './options';
import { partnersOf, studentLabel } from './students';

/**
 * Problèmes d'un élève une fois (éventuellement) placé dans une classe.
 * Liste vide = aucun problème. Sert à la mise en évidence rouge + tooltip.
 */
export function studentProblems(store: ProjectStore, student: Student): string[] {
	const problems: string[] = [];
	const classId = student.assignedClassId;
	if (!classId) return problems; // non placé : pas d'incohérence de classe

	// 1) Option incompatible avec la classe d'affectation.
	for (const optId of student.optionIds) {
		if (!isOffered(store, classId, optId)) {
			const name = store.options.get(optId)?.name ?? 'option';
			problems.push(`Option « ${name} » non proposée par cette classe`);
		}
	}

	// 2) « Être avec » : un camarade lié placé dans une AUTRE classe.
	for (const pid of partnersOf(store, student.id, 'with')) {
		const peer = store.students.get(pid);
		if (peer?.assignedClassId && peer.assignedClassId !== classId)
			problems.push(`Doit être avec ${studentLabel(peer)} (classe différente)`);
	}

	// 3) « Séparer de » : un camarade à séparer placé dans la MÊME classe.
	for (const pid of partnersOf(store, student.id, 'apart')) {
		const peer = store.students.get(pid);
		if (peer?.assignedClassId === classId)
			problems.push(`Doit être séparé de ${studentLabel(peer)} (même classe)`);
	}

	return problems;
}
