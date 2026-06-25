import * as XLSX from 'xlsx';
import type { ProjectStore } from '../store/project.svelte';
import type { Academic, Moteur, Perturbateur, Sex, Student } from '../types';
import { classesOfLevel, optionsOf } from '../domain/options';
import { COL, extraOptionColumnsForLevel, levelSheetNames, optionColumnsForLevel } from './odsSchema';

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

function parseMoteur(v: string): Moteur {
	const u = v.toUpperCase().replace(/\s/g, '');
	return (['M+', 'M'] as const).find((x) => x === u) ?? '';
}

function parsePerturbateur(v: string): Perturbateur {
	const u = v.toUpperCase().replace(/\s/g, '');
	return (['Z+', 'Z'] as const).find((x) => x === u) ?? '';
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
		const extraCols = extraOptionColumnsForLevel(store, levelId);
		const classes = classesOfLevel(store, levelId);
		let count = 0;

		for (const [idx, row] of rows.entries()) {
			const lastName = norm(row[COL.lastName]);
			const firstName = norm(row[COL.firstName]);
			if (!lastName && !firstName) continue; // ligne vide

			const optionIds = new Set<string>();
			for (const col of optionCols) {
				const cell = norm(row[col.header]);
				if (!cell) continue;
				if (col.kind === 'pure') {
					if (col.optionId && isTruthy(cell)) optionIds.add(col.optionId);
				} else {
					// choix : la cellule contient le nom de l'option choisie.
					const opt = optionsOf(store, col.groupId).find(
						(o) => o.name.toLowerCase() === cell.toLowerCase()
					);
					if (opt) optionIds.add(opt.id);
					else warnings.push(`${levelName} ligne ${idx + 2} : option « ${cell} » inconnue pour ${col.header}.`);
				}
			}
			// Colonnes « une par option » en fin de feuille : cellule cochée = option suivie.
			for (const col of extraCols) {
				if (isTruthy(norm(row[col.header]))) optionIds.add(col.optionId);
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
				moteur: parseMoteur(norm(row[COL.moteur])),
				perturbateur: parsePerturbateur(norm(row[COL.perturbateur])),
				originClass: norm(row[COL.originClass]),
				optionIds: [...optionIds],
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
