/** Étapes du flux de constitution, utilisées par la navigation latérale. */
export interface NavStep {
	href: string;
	num: number;
	label: string;
	hint: string;
}

export const steps: NavStep[] = [
	{ href: '/structure/', num: 1, label: 'Structure', hint: 'Niveaux et classes' },
	{ href: '/options/', num: 2, label: 'Options', hint: 'Choix et options par classe' },
	{ href: '/secretariat/', num: 3, label: 'Secrétariat', hint: 'Export / import du tableau .ods' },
	{ href: '/eleves/', num: 4, label: 'Élèves', hint: 'Liste, filtres et liens' },
	{ href: '/constitution/', num: 5, label: 'Constitution', hint: 'Placement et export final' }
];
