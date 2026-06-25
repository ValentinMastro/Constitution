import type { ProjectStore } from '../store/project.svelte';
import { groupsForLevel, optionsOf } from '../domain/options';

/**
 * Schéma de colonnes du tableau .ods, partagé entre l'export (Phase 3) et
 * l'import (Phase 4) pour garantir un aller-retour cohérent.
 */

export const COL = {
	lastName: 'Nom',
	firstName: 'Prénom',
	sex: 'Sexe (F/G)',
	academic: 'Niveau (A-D)',
	moteur: 'Moteur (M/M+)',
	perturbateur: 'Perturbateur (Z/Z+)',
	originClass: "Classe d'origine",
	futureClass: 'Future classe'
} as const;

export const FIXED_BEFORE: string[] = [
	COL.lastName,
	COL.firstName,
	COL.sex,
	COL.academic,
	COL.moteur,
	COL.perturbateur,
	COL.originClass
];
export const FIXED_AFTER: string[] = [COL.futureClass];

/** Une colonne d'option du tableau. */
export interface OptionColumn {
	header: string;
	kind: 'choix' | 'pure';
	groupId: string;
	/** Renseigné pour les options « pure » (1 colonne par option). */
	optionId?: string;
}

/** Colonnes d'options pour un niveau, dans l'ordre des groupes/options. */
export function optionColumnsForLevel(store: ProjectStore, levelId: string): OptionColumn[] {
	const cols: OptionColumn[] = [];
	for (const g of groupsForLevel(store, levelId)) {
		if (g.kind === 'choix') {
			cols.push({ header: g.name, kind: 'choix', groupId: g.id });
		} else {
			for (const o of optionsOf(store, g.id))
				cols.push({ header: o.name, kind: 'pure', groupId: g.id, optionId: o.id });
		}
	}
	return cols;
}

/** En-têtes complets d'une feuille de niveau (ordre des colonnes). */
export function headersForLevel(store: ProjectStore, levelId: string): string[] {
	return [
		...FIXED_BEFORE,
		...optionColumnsForLevel(store, levelId).map((c) => c.header),
		...FIXED_AFTER
	];
}

/** Nettoie un nom de feuille .ods : ≤ 31 caractères, sans caractères interdits. */
export function sanitizeSheetName(name: string, used: Set<string>): string {
	const base = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Niveau';
	let candidate = base;
	let n = 2;
	while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 25)} ${n++}`;
	used.add(candidate.toLowerCase());
	return candidate;
}

/**
 * Associe chaque niveau à son nom de feuille .ods, dans l'ordre des niveaux.
 * Utilisé à l'export ET à l'import pour garantir un appariement déterministe.
 */
export function levelSheetNames(
	store: ProjectStore
): { levelId: string; levelName: string; sheetName: string }[] {
	const used = new Set<string>();
	return [...store.levels.items]
		.sort((a, b) => a.order - b.order)
		.map((l) => ({ levelId: l.id, levelName: l.name, sheetName: sanitizeSheetName(l.name, used) }));
}
