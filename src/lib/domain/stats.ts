import type { Academic, Student } from '../types';

export interface ClassStats {
	total: number;
	filles: number;
	garcons: number;
	academic: Record<Academic, number>;
	moteur: number;
	perturbateur: number;
}

export function classStats(students: Student[]): ClassStats {
	const s: ClassStats = {
		total: students.length,
		filles: 0,
		garcons: 0,
		academic: { A: 0, B: 0, C: 0, D: 0 },
		moteur: 0,
		perturbateur: 0
	};
	for (const st of students) {
		if (st.sex === 'F') s.filles++;
		else if (st.sex === 'G') s.garcons++;
		if (st.academic) s.academic[st.academic]++;
		if (st.moteur) s.moteur++;
		if (st.perturbateur) s.perturbateur++;
	}
	return s;
}
