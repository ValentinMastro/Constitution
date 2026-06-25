<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { Student } from '$lib/types';
	import { classStats } from '$lib/domain/stats';
	import { optionColor, optionsOfClass } from '$lib/domain/options';
	import ClassStats from './ClassStats.svelte';
	import StudentCard from './StudentCard.svelte';

	let {
		store,
		zoneId,
		name,
		capacity,
		items,
		highlightId,
		withSet,
		apartSet,
		onsort,
		onhover,
		onpin
	}: {
		store: ProjectStore;
		zoneId: string;
		name: string;
		capacity: number | null;
		items: Student[];
		highlightId: string | null;
		withSet: Set<string>;
		apartSet: Set<string>;
		onsort: (zoneId: string, items: Student[], commit: boolean) => void;
		onhover: (id: string | null) => void;
		onpin: (id: string) => void;
	} = $props();

	const stats = $derived(classStats(items));
	// Options offertes par la classe (la zone « Non affectés » n'en a aucune).
	const options = $derived(optionsOfClass(store, zoneId));

	function consider(e: CustomEvent<DndEvent<Student>>) {
		onsort(zoneId, e.detail.items, false);
	}
	function finalize(e: CustomEvent<DndEvent<Student>>) {
		onsort(zoneId, e.detail.items, true);
	}
</script>

<div class="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50">
	<header class="border-b border-slate-200 px-2 py-1.5">
		<div class="flex items-center justify-between">
			<span class="truncate font-semibold">{name}</span>
		</div>
		{#if capacity !== null}
			<div class="mt-1"><ClassStats {stats} {capacity} /></div>
		{:else}
			<div class="mt-1 text-xs text-slate-400">{stats.total} élève(s)</div>
		{/if}
		{#if options.length}
			<div class="mt-1 flex flex-wrap gap-0.5">
				{#each options as option (option.id)}
					<span class="rounded px-1 text-xs leading-tight {optionColor(option.name)}" title="Option offerte">{option.name}</span>
				{/each}
			</div>
		{/if}
	</header>

	<div
		class="flex-1 space-y-1 overflow-y-auto p-1.5"
		use:dndzone={{ items, flipDurationMs: 150, dropTargetStyle: { outline: '2px dashed #6366f1' } }}
		onconsider={consider}
		onfinalize={finalize}
	>
		{#each items as s (s.id)}
			<StudentCard {store} student={s} {highlightId} {withSet} {apartSet} {onhover} {onpin} />
		{/each}
	</div>
</div>
