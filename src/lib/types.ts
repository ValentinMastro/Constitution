// Modèle de domaine de l'application de constitution des classes.
// Toutes ces entités vivent dans le document Yjs (cf. src/lib/store/project.svelte.ts).

export type Id = string;

/** Un niveau scolaire ciblé, ex. « Futurs 6èmes ». */
export interface Level {
	id: Id;
	name: string;
	order: number;
}

/** Une classe rattachée à un niveau. Nom libre (A/B/C, 1/2/3, couleurs…). */
export interface ClassRoom {
	id: Id;
	levelId: Id;
	name: string;
	capacity: number;
	order: number;
}

/**
 * Un groupe d'options.
 * - `choix` : groupe exclusif OBLIGATOIRE (ex. LV2 → exactement un choix parmi N).
 * - `pure`  : options facultatives indépendantes.
 */
export type OptionKind = 'choix' | 'pure';

export interface OptionGroup {
	id: Id;
	name: string;
	kind: OptionKind;
	/** null = applicable à tous les niveaux ; sinon restreint à ce niveau. */
	levelId: Id | null;
	order: number;
}

/** Une option concrète, membre d'un groupe (ex. « Espagnol » dans le groupe « LV2 »). */
export interface OptionItem {
	id: Id;
	groupId: Id;
	name: string;
	order: number;
}

/** Indique qu'une classe OFFRE une option donnée. */
export interface ClassOption {
	id: Id;
	classId: Id;
	optionId: Id;
}

export type Sex = 'F' | 'G';
export type Academic = 'A' | 'B' | 'C' | 'D';
/** Moteur (M/M+) ou perturbateur (Z/Z+), ou rien. */
export type Behavior = '' | 'M' | 'M+' | 'Z' | 'Z+';

export interface Student {
	id: Id;
	levelId: Id;
	lastName: string;
	firstName: string;
	sex: Sex | '';
	academic: Academic | '';
	behavior: Behavior;
	originClass: string;
	/** ids des OptionItem choisis par l'élève. */
	optionIds: Id[];
	/** classe d'affectation pendant la constitution ; null tant que non placé. */
	assignedClassId: Id | null;
}

export type LinkType = 'with' | 'apart';

/** Lien symétrique entre deux élèves : « être avec » (with) ou « séparer de » (apart). */
export interface StudentLink {
	id: Id;
	type: LinkType;
	a: Id;
	b: Id;
}

/** Métadonnées d'un projet (registre local, hors document Yjs). */
export interface ProjectMeta {
	id: Id;
	name: string;
	/** Clé de partage : sert de mot de passe de salon pour la sync P2P (Phase 7). */
	shareKey: string;
	createdAt: number;
}
