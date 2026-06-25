import * as XLSX from 'xlsx';
import type { ProjectStore } from '../store/project.svelte';
import type { Student } from '../types';
import { optionsOf } from '../domain/options';
import { downloadBlob, safeFileName } from './download';
import { headersForLevel, levelSheetNames, optionColumnsForLevel, type OptionColumn } from './odsSchema';

function studentRow(store: ProjectStore, s: Student, optionCols: OptionColumn[]): string[] {
	const before = [s.lastName, s.firstName, s.sex, s.academic, s.moteur, s.perturbateur, s.originClass];

	const opts = optionCols.map((col) => {
		if (col.kind === 'choix') {
			const chosen = optionsOf(store, col.groupId).find((o) => s.optionIds.includes(o.id));
			return chosen?.name ?? '';
		}
		return col.optionId && s.optionIds.includes(col.optionId) ? 'X' : '';
	});

	const future = s.assignedClassId ? (store.classes.get(s.assignedClassId)?.name ?? '') : '';
	return [...before, ...opts, future];
}

/**
 * Classeur des résultats : reflète l'état courant, une feuille par niveau,
 * avec la colonne « Future classe » renseignée à partir des affectations.
 */
export function buildResultsWorkbook(store: ProjectStore): XLSX.WorkBook {
	const wb = XLSX.utils.book_new();

	for (const { levelId, sheetName } of levelSheetNames(store)) {
		const headers = headersForLevel(store, levelId);
		const optionCols = optionColumnsForLevel(store, levelId);
		const students = store.students.items
			.filter((s) => s.levelId === levelId)
			.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'));

		const aoa = [headers, ...students.map((s) => studentRow(store, s, optionCols))];
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
