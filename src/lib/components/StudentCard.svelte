<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { Student } from '$lib/types';
	import { studentLabel, linksOf } from '$lib/domain/students';
	import { optionColor } from '$lib/domain/options';
	import { studentProblems } from '$lib/domain/validation';

	let {
		store,
		student,
		highlightId,
		withSet,
		apartSet,
		onhover,
		onpin,
		onlongpress
	}: {
		store: ProjectStore;
		student: Student;
		highlightId: string | null;
		withSet: Set<string>;
		apartSet: Set<string>;
		onhover: (id: string | null) => void;
		onpin: (id: string) => void;
		onlongpress?: (student: Student) => void;
	} = $props();

	// Appui long (mobile) : maintien immobile ~500 ms → menu de déplacement.
	// Un déplacement (drag/scroll) annule le timer ; le clic suivant est neutralisé.
	let pressTimer: ReturnType<typeof setTimeout> | null = null;
	let pressX = 0;
	let pressY = 0;
	let longPressed = false;

	function clearPress() {
		if (pressTimer) clearTimeout(pressTimer);
		pressTimer = null;
	}
	function onTouchStart(e: TouchEvent) {
		if (!onlongpress) return;
		const t = e.touches[0];
		pressX = t.clientX;
		pressY = t.clientY;
		longPressed = false;
		clearPress();
		pressTimer = setTimeout(() => {
			longPressed = true;
			onlongpress?.(student);
		}, 500);
	}
	function onTouchMove(e: TouchEvent) {
		const t = e.touches[0];
		if (Math.abs(t.clientX - pressX) > 10 || Math.abs(t.clientY - pressY) > 10) clearPress();
	}

	const problems = $derived(studentProblems(store, student));
	const linked = $derived(linksOf(store, student.id).length > 0);

	// Options de l'élève (id + nom), pour les afficher sur une 2e ligne.
	const options = $derived(
		student.optionIds
			.map((id) => store.options.get(id))
			.filter((o): o is NonNullable<typeof o> => !!o)
	);


	const isSource = $derived(highlightId === student.id);
	const isWith = $derived(withSet.has(student.id));
	const isApart = $derived(apartSet.has(student.id));

	// Anneau de mise en évidence selon la relation au sujet survolé/épinglé.
	const ring = $derived(
		isSource
			? 'ring-2 ring-indigo-500'
			: isWith
				? 'ring-2 ring-emerald-500'
				: isApart
					? 'ring-2 ring-rose-500'
					: ''
	);
	const dimmed = $derived(highlightId && !isSource && !isWith && !isApart);
</script>

<div
	role="button"
	tabindex="0"
	title={problems.length ? problems.join('\n') : studentLabel(student)}
	class="flex cursor-grab flex-col gap-0.5 rounded border px-1.5 py-1 text-xs select-none {problems.length
		? 'border-red-400 bg-red-50'
		: 'border-slate-200 bg-white'} {ring} {dimmed ? 'opacity-40' : ''}"
	onmouseenter={() => onhover(student.id)}
	onmouseleave={() => onhover(null)}
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={clearPress}
	ontouchcancel={clearPress}
	oncontextmenu={(e) => e.preventDefault()}
	onclick={() => {
		if (longPressed) {
			longPressed = false;
			return;
		}
		onpin(student.id);
	}}
	onkeydown={(e) => e.key === 'Enter' && onpin(student.id)}
>
	<div class="flex items-center gap-1">
		{#if problems.length}<span class="text-red-500" aria-label="problème">⚠</span>{/if}
		<span class="min-w-0 flex-1 truncate font-medium text-slate-800">{studentLabel(student)}</span>
		{#if linked}<span class="text-indigo-500" aria-label="liens">🔗</span>{/if}
		<span class="rounded px-1 {student.sex === 'F' ? 'bg-pink-100 text-pink-700' : student.sex === 'G' ? 'bg-blue-100 text-blue-700' : 'text-slate-300'}">
			{student.sex || '·'}
		</span>
		<span class="w-3 text-center font-semibold text-slate-500">{student.academic || '·'}</span>
		{#if student.moteur}
			<span class="rounded bg-emerald-100 px-1 text-emerald-700" title="Moteur">{student.moteur}</span>
		{/if}
		{#if student.perturbateur}
			<span class="rounded bg-amber-100 px-1 text-amber-700" title="Perturbateur">{student.perturbateur}</span>
		{/if}
	</div>
	{#if options.length}
		<div class="flex flex-wrap gap-0.5">
			{#each options as option (option.id)}
				<span class="rounded px-1 leading-tight {optionColor(option.name)}" title="Option">{option.name}</span>
			{/each}
		</div>
	{/if}
</div>
