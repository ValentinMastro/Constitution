<script lang="ts">
	import ClassColumn from '$lib/components/ClassColumn.svelte';
	import { classesOfLevel, optionsForLevel } from '$lib/domain/options';
	import { partnersOf } from '$lib/domain/students';
	import { exportResults } from '$lib/services/odsExportResults';
	import { project } from '$lib/store/project.svelte';
	import { registry } from '$lib/store/registry.svelte';
	import type { Student } from '$lib/types';

	const UNPLACED = '__unplaced__';
	const store = $derived(project.current!);
	const levels = $derived([...store.levels.items].sort((a, b) => a.order - b.order));

	let selectedLevelId = $state('');
	const levelId = $derived(selectedLevelId || levels[0]?.id || '');
	const classes = $derived(levelId ? classesOfLevel(store, levelId) : []);
	const levelOptions = $derived(levelId ? optionsForLevel(store, levelId) : []);

	// Tableau local piloté par le drag&drop, re-dérivé de Yjs hors interaction.
	let board = $state<Record<string, Student[]>>({});
	$effect(() => {
		const next: Record<string, Student[]> = { [UNPLACED]: [] };
		for (const c of classes) next[c.id] = [];
		for (const s of store.students.items) {
			if (s.levelId !== levelId) continue;
			const zid = s.assignedClassId && next[s.assignedClassId] ? s.assignedClassId : UNPLACED;
			next[zid].push(s);
		}
		board = next;
	});

	function onsort(zoneId: string, items: Student[], commit: boolean) {
		board[zoneId] = items;
		if (!commit) return;
		store.transact(() => {
			for (const [zid, list] of Object.entries(board)) {
				const target = zid === UNPLACED ? null : zid;
				for (const s of list) {
					const cur = store.students.get(s.id);
					if (cur && cur.assignedClassId !== target)
						store.students.update(s.id, { assignedClassId: target });
				}
			}
		});
	}

	// Mise en évidence des liens (survol temporaire, clic persistant).
	let hoveredId = $state<string | null>(null);
	let pinnedId = $state<string | null>(null);
	const highlightId = $derived(hoveredId ?? pinnedId);
	const withSet = $derived(new Set(highlightId ? partnersOf(store, highlightId, 'with') : []));
	const apartSet = $derived(new Set(highlightId ? partnersOf(store, highlightId, 'apart') : []));

	function onpin(id: string) {
		pinnedId = pinnedId === id ? null : id;
	}

	const placed = $derived(
		store.students.items.filter((s) => s.levelId === levelId && s.assignedClassId).length
	);
	const totalLevel = $derived(store.students.items.filter((s) => s.levelId === levelId).length);
</script>

<div class="flex h-full flex-col">
	<header class="mb-3 flex items-center gap-3">
		<h1 class="text-xl font-bold">Constitution</h1>
		{#if levels.length > 1}
			<select class="rounded-lg border border-slate-300 px-2 py-1 text-sm" bind:value={selectedLevelId}>
				{#each levels as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
			</select>
		{:else if levels[0]}
			<span class="text-sm text-slate-500">{levels[0].name}</span>
		{/if}
		<span class="text-sm text-slate-500">{placed}/{totalLevel} placés</span>
		<button
			class="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
			onclick={() => exportResults(store, registry.get(store.id)?.name ?? 'projet')}
			title="Exporter le .ods avec la colonne Future classe remplie"
		>
			⬇ Exporter les résultats
		</button>
		{#if pinnedId}
			<button
				class="ml-auto rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
				onclick={() => (pinnedId = null)}
			>
				Liens épinglés — cliquer pour libérer
			</button>
		{:else}
			<span class="ml-auto text-xs text-slate-400">Survolez 🔗 pour voir les liens, cliquez pour épingler</span>
		{/if}
	</header>

	{#if levelId}
		<div class="flex min-h-0 flex-1 gap-2">
			<div class="flex h-full w-44 shrink-0">
				<ClassColumn
					{store}
					zoneId={UNPLACED}
					name="Non affectés"
					capacity={null}
					items={board[UNPLACED] ?? []}
					filterable
					filterOptions={levelOptions}
					{highlightId}
					{withSet}
					{apartSet}
					{onsort}
					onhover={(id) => (hoveredId = id)}
					{onpin}
				/>
			</div>
			<div class="grid min-h-0 flex-1 gap-2" style="grid-template-columns: repeat({Math.max(classes.length, 1)}, minmax(0, 1fr));">
				{#each classes as c (c.id)}
					<ClassColumn
						{store}
						zoneId={c.id}
						name={c.name}
						capacity={c.capacity}
						items={board[c.id] ?? []}
						{highlightId}
						{withSet}
						{apartSet}
						{onsort}
						onhover={(id) => (hoveredId = id)}
						{onpin}
					/>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-slate-400">Définissez des niveaux et des classes, puis importez des élèves.</p>
	{/if}
</div>
