import * as XLSX from 'xlsx';
import type { ProjectStore } from '../store/project.svelte';
import type { Academic, Behavior, Sex, Student } from '../types';
import { classesOfLevel, optionsOf } from '../domain/options';
import { COL, levelSheetNames, optionColumnsForLevel } from './odsSchema';

export interface ImportResult {
	students: Student[];
	perLevel: { levelName: string; count: number }[];
	warnings: string[];
}

const norm = (v: unknown): string => String(v ?? '').trim();

function parseSex(v: string): Sex | '' {
	const u = v.toUpperCase();
	if (u === 'F') return 'F';
	if (u === 'G' || u === 'M' /* tolère M=masculin */) return 'G';
	return '';
}

function parseAcademic(v: string): Academic | '' {
	const u = v.toUpperCase();
	return (['A', 'B', 'C', 'D'] as const).find((x) => x === u) ?? '';
}

function parseBehavior(v: string): Behavior {
	const u = v.toUpperCase().replace(/\s/g, '');
	return (['M+', 'M', 'Z+', 'Z'] as const).find((x) => x === u) ?? '';
}

const isTruthy = (v: string): boolean => /^(x|oui|o|yes|y|1|vrai|true)$/i.test(v.trim());

/** Analyse un classeur .ods complété en fonction de la structure du projet. */
export function parseWorkbook(store: ProjectStore, wb: XLSX.WorkBook): ImportResult {
	const students: Student[] = [];
	const perLevel: { levelName: string; count: number }[] = [];
	const warnings: string[] = [];

	for (const { levelId, levelName, sheetName } of levelSheetNames(store)) {
		const ws = wb.Sheets[sheetName];
		if (!ws) {
			warnings.push(`Feuille « ${sheetName} » introuvable (niveau ${levelName}).`);
			perLevel.push({ levelName, count: 0 });
			continue;
		}

		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
		const optionCols = optionColumnsForLevel(store, levelId);
		const classes = classesOfLevel(store, levelId);
		let count = 0;

		for (const [idx, row] of rows.entries()) {
			const lastName = norm(row[COL.lastName]);
			const firstName = norm(row[COL.firstName]);
			if (!lastName && !firstName) continue; // ligne vide

			const optionIds: string[] = [];
			for (const col of optionCols) {
				const cell = norm(row[col.header]);
				if (!cell) continue;
				if (col.kind === 'pure') {
					if (col.optionId && isTruthy(cell)) optionIds.push(col.optionId);
				} else {
					// choix : la cellule contient le nom de l'option choisie.
					const opt = optionsOf(store, col.groupId).find(
						(o) => o.name.toLowerCase() === cell.toLowerCase()
					);
					if (opt) optionIds.push(opt.id);
					else warnings.push(`${levelName} ligne ${idx + 2} : option « ${cell} » inconnue pour ${col.header}.`);
				}
			}

			const futureName = norm(row[COL.futureClass]);
			const assigned = futureName
				? (classes.find((c) => c.name.toLowerCase() === futureName.toLowerCase())?.id ?? null)
				: null;

			students.push({
				id: crypto.randomUUID(),
				levelId,
				lastName,
				firstName,
				sex: parseSex(norm(row[COL.sex])),
				academic: parseAcademic(norm(row[COL.academic])),
				behavior: parseBehavior(norm(row[COL.behavior])),
				originClass: norm(row[COL.originClass]),
				optionIds,
				assignedClassId: assigned
			});
			count++;
		}
		perLevel.push({ levelName, count });
	}

	return { students, perLevel, warnings };
}

/** Remplace tous les élèves (et purge les liens, devenus orphelins). */
export function applyImport(store: ProjectStore, students: Student[]): void {
	store.transact(() => {
		store.links.removeWhere(() => true);
		store.students.removeWhere(() => true);
		for (const s of students) store.students.add(s);
	});
}

/** Lit un fichier .ods et renvoie le résultat d'analyse. */
export async function readOdsFile(store: ProjectStore, file: File): Promise<ImportResult> {
	const buf = await file.arrayBuffer();
	const wb = XLSX.read(buf, { type: 'array' });
	return parseWorkbook(store, wb);
}
