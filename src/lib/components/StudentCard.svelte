<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { Student } from '$lib/types';
	import { studentLabel, linksOf } from '$lib/domain/students';
	import { studentProblems } from '$lib/domain/validation';

	let {
		store,
		student,
		highlightId,
		withSet,
		apartSet,
		onhover,
		onpin
	}: {
		store: ProjectStore;
		student: Student;
		highlightId: string | null;
		withSet: Set<string>;
		apartSet: Set<string>;
		onhover: (id: string | null) => void;
		onpin: (id: string) => void;
	} = $props();

	const problems = $derived(studentProblems(store, student));
	const linked = $derived(linksOf(store, student.id).length > 0);

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
	class="flex cursor-grab items-center gap-1 rounded border px-1.5 py-1 text-xs select-none {problems.length
		? 'border-red-400 bg-red-50'
		: 'border-slate-200 bg-white'} {ring} {dimmed ? 'opacity-40' : ''}"
	onmouseenter={() => onhover(student.id)}
	onmouseleave={() => onhover(null)}
	onclick={() => onpin(student.id)}
	onkeydown={(e) => e.key === 'Enter' && onpin(student.id)}
>
	{#if problems.length}<span class="text-red-500" aria-label="problème">⚠</span>{/if}
	<span class="min-w-0 flex-1 truncate font-medium text-slate-800">{studentLabel(student)}</span>
	{#if linked}<span class="text-indigo-500" aria-label="liens">🔗</span>{/if}
	<span class="rounded px-1 {student.sex === 'F' ? 'bg-pink-100 text-pink-700' : student.sex === 'G' ? 'bg-blue-100 text-blue-700' : 'text-slate-300'}">
		{student.sex || '·'}
	</span>
	<span class="w-3 text-center font-semibold text-slate-500">{student.academic || '·'}</span>
	{#if student.behavior}
		<span class="rounded px-1 {student.behavior.startsWith('M') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
			{student.behavior}
		</span>
	{/if}
</div>
