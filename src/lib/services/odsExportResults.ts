import * as XLSX from 'xlsx';
import type { ProjectStore } from '../store/project.svelte';
import type { Student } from '../types';
import { downloadBlob, safeFileName } from './download';
import {
	extraOptionColumnsForLevel,
	headersForLevel,
	levelSheetNames,
	type ExtraOptionColumn
} from './odsSchema';

function studentRow(store: ProjectStore, s: Student, extraCols: ExtraOptionColumn[]): string[] {
	const before = [s.lastName, s.firstName, s.sex, s.academic, s.moteur, s.perturbateur, s.originClass];

	const future = s.assignedClassId ? (store.classes.get(s.assignedClassId)?.name ?? '') : '';
	const extra = extraCols.map((col) => (s.optionIds.includes(col.optionId) ? 'X' : ''));
	return [...before, future, ...extra];
}

/**
 * Classeur des résultats : reflète l'état courant, une feuille par niveau,
 * avec la colonne « Future classe » renseignée à partir des affectations.
 */
export function buildResultsWorkbook(store: ProjectStore): XLSX.WorkBook {
	const wb = XLSX.utils.book_new();

	for (const { levelId, sheetName } of levelSheetNames(store)) {
		const headers = headersForLevel(store, levelId);
		const extraCols = extraOptionColumnsForLevel(store, levelId);
		const students = store.students.items
			.filter((s) => s.levelId === levelId)
			.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'));

		const aoa = [headers, ...students.map((s) => studentRow(store, s, extraCols))];
		const ws = XLSX.utils.aoa_to_sheet(aoa);
		ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
		XLSX.utils.book_append_sheet(wb, ws, sheetName);
	}

	return wb;
}

export function exportResults(store: ProjectStore, projectName: string): void {
	const wb = buildResultsWorkbook(store);
	const buf = XLSX.write(wb, { bookType: 'ods', type: 'array' });
	const blob = new Blob([buf], { type: 'application/vnd.oasis.opendocument.spreadsheet' });
	downloadBlob(`${safeFileName(projectName)}_resultats.ods`, blob);
}
