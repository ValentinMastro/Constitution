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
		onselect
	}: {
		store: ProjectStore;
		student: Student;
		highlightId: string | null;
		withSet: Set<string>;
		apartSet: Set<string>;
		onhover: (id: string | null) => void;
		onpin: (id: string) => void;
		// Mobile : si fourni, un simple tap appelle onselect au lieu d'épingler les liens.
		onselect?: (student: Student) => void;
	} = $props();

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
	class="flex flex-col rounded border px-1.5 py-0.5 text-xs leading-tight select-none {onselect
		? 'cursor-pointer'
		: 'cursor-grab'} {problems.length
		? 'border-red-400 bg-red-50'
		: 'border-slate-200 bg-white'} {ring} {dimmed ? 'opacity-40' : ''}"
	onmouseenter={() => onhover(student.id)}
	onmouseleave={() => onhover(null)}
	onclick={() => (onselect ? onselect(student) : onpin(student.id))}
	onkeydown={(e) => e.key === 'Enter' && (onselect ? onselect(student) : onpin(student.id))}
>
	{#snippet badges()}
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
	{/snippet}

	<div class="flex items-center gap-1">
		{#if problems.length}<span class="text-red-500" aria-label="problème">⚠</span>{/if}
		<span class="flex min-w-0 flex-1 items-center gap-1 font-medium text-slate-800">
			{#if student.lastName || student.firstName}
				<!-- Seul le NOM se tronque (…) ; le prénom reste toujours visible. -->
				<span class="min-w-0 truncate">{student.lastName}</span>
				{#if student.firstName}<span class="shrink-0">{student.firstName}</span>{/if}
			{:else}
				(sans nom)
			{/if}
		</span>
		{#if linked}<span class="text-indigo-500" aria-label="liens">🔗</span>{/if}
		<!-- Sans option : tout tient sur la 1ère ligne (inchangé). -->
		{#if !options.length}{@render badges()}{/if}
	</div>
	{#if options.length}
		<!-- Avec options : 2e ligne = options à gauche, badges F/G A/B/C/D M/Z à la fin. -->
		<div class="flex items-center gap-1">
			<div class="flex min-w-0 flex-1 flex-wrap gap-0.5">
				{#each options as option (option.id)}
					<span class="rounded px-1 leading-tight {optionColor(option.name)}" title="Option">{option.name}</span>
				{/each}
			</div>
			{@render badges()}
		</div>
	{/if}
</div>
