import * as XLSX from 'xlsx';
import type { ProjectStore } from '../store/project.svelte';
import { classesOfLevel, groupsForLevel, optionsOf } from '../domain/options';
import { downloadBlob, safeFileName } from './download';
import { COL, headersForLevel, levelSheetNames } from './odsSchema';

/**
 * Construit le classeur modèle : une feuille par niveau (en-têtes seuls, à
 * remplir par le secrétariat) + une feuille « Référence » des valeurs autorisées.
 */
export function buildTemplateWorkbook(store: ProjectStore): XLSX.WorkBook {
	const wb = XLSX.utils.book_new();

	for (const { levelId, sheetName } of levelSheetNames(store)) {
		const headers = headersForLevel(store, levelId);
		const ws = XLSX.utils.aoa_to_sheet([headers]);
		ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
		XLSX.utils.book_append_sheet(wb, ws, sheetName);
	}

	XLSX.utils.book_append_sheet(wb, buildReferenceSheet(store), 'Référence');
	return wb;
}

function buildReferenceSheet(store: ProjectStore): XLSX.WorkSheet {
	const rows: (string | null)[][] = [
		['VALEURS AUTORISÉES — ne pas modifier les en-têtes des feuilles de niveau'],
		[],
		[COL.sex, 'F = fille, G = garçon'],
		[COL.academic, 'A (meilleur) · B · C · D (le moins bon)'],
		[COL.behavior, 'vide · M · M+ (moteur) · Z · Z+ (perturbateur)'],
		[COL.originClass, 'texte libre (classe précédente)'],
		[COL.futureClass, 'laisser vide — rempli par l’application'],
		[]
	];

	const levels = [...store.levels.items].sort((a, b) => a.order - b.order);
	for (const level of levels) {
		const classes = classesOfLevel(store, level.id);
		rows.push([`— ${level.name} —`]);
		if (classes.length) rows.push(['Classes', classes.map((c) => c.name).join(', ')]);
		for (const g of groupsForLevel(store, level.id)) {
			const opts = optionsOf(store, g.id).map((o) => o.name);
			const tag = g.kind === 'choix' ? 'un seul (obligatoire)' : 'X si choisie';
			rows.push([g.name, `${opts.join(', ') || '(aucune option)'}  →  ${tag}`]);
		}
		rows.push([]);
	}

	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = [{ wch: 24 }, { wch: 60 }];
	return ws;
}

/** Génère et télécharge le modèle .ods. */
export function exportTemplate(store: ProjectStore, projectName: string): void {
	const wb = buildTemplateWorkbook(store);
	const buf = XLSX.write(wb, { bookType: 'ods', type: 'array' });
	const blob = new Blob([buf], { type: 'application/vnd.oasis.opendocument.spreadsheet' });
	downloadBlob(`${safeFileName(projectName)}_modele.ods`, blob);
}
