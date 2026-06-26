<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import ClassColumn from '$lib/components/ClassColumn.svelte';
	import StudentClassMenu from '$lib/components/StudentClassMenu.svelte';
	import { classesOfLevel, isOffered, optionsForLevel } from '$lib/domain/options';
	import { partnersOf } from '$lib/domain/students';
	import { exportResults } from '$lib/services/odsExportResults';
	import { project } from '$lib/store/project.svelte';
	import { registry } from '$lib/store/registry.svelte';
	import type { Student } from '$lib/types';

	const UNPLACED = '__unplaced__';
	// Vue desktop/mobile pilotée par une vraie media query : on ne monte qu'UNE seule
	// des deux vues. Les masquer en CSS (`md:hidden`) laisserait les deux dndzones
	// montées avec les mêmes élèves (mêmes id) → svelte-dnd-action casse le drag&drop.
	const desktop = new MediaQuery('min-width: 768px');
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

	// ── Vue mobile : carrousel d'une zone à la fois + menu de déplacement ──────
	type Zone = { id: string; name: string; capacity: number | null; unplaced: boolean };
	const zones = $derived<Zone[]>([
		{ id: UNPLACED, name: 'Non affectés', capacity: null, unplaced: true },
		...classes.map((c) => ({ id: c.id, name: c.name, capacity: c.capacity, unplaced: false }))
	]);
	let mobileIndex = $state(0);
	// Réinitialise au changement de niveau (les zones changent).
	$effect(() => {
		void levelId;
		mobileIndex = 0;
	});
	const current = $derived(zones[mobileIndex] ?? zones[0]);
	function go(d: number) {
		mobileIndex = (mobileIndex + d + zones.length) % zones.length;
	}

	// Détection de swipe horizontal sur le conteneur de la colonne mobile.
	let touchX = 0;
	let touchY = 0;
	function onTouchStart(e: TouchEvent) {
		touchX = e.changedTouches[0].clientX;
		touchY = e.changedTouches[0].clientY;
	}
	function onTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchX;
		const dy = e.changedTouches[0].clientY - touchY;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
	}

	// Menu de déplacement (appui long sur une carte).
	let menuStudent = $state<Student | null>(null);
	const canAccept = (s: Student, zoneId: string) =>
		zoneId === UNPLACED || s.optionIds.every((id) => isOffered(store, zoneId, id));
	const menuZones = $derived.by(() => {
		const s = menuStudent;
		if (!s) return [];
		const currentZone = s.assignedClassId ?? UNPLACED;
		return zones
			.filter((z) => z.id !== currentZone)
			.map((z) => ({
				id: z.id,
				name: z.name,
				capacity: z.capacity,
				count: board[z.id]?.length ?? 0,
				canAccept: canAccept(s, z.id)
			}));
	});
	function moveTo(zoneId: string) {
		if (menuStudent) store.students.update(menuStudent.id, { assignedClassId: zoneId === UNPLACED ? null : zoneId });
		menuStudent = null;
	}
</script>

<div class="flex flex-col md:h-full">
	<header class="mb-2 flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
		<h1 class="text-lg font-bold">Constitution</h1>
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
		{#if desktop.current}
			<!-- Vue PC : toutes les colonnes côte à côte. -->
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
			<!-- Vue mobile : une seule zone à la fois, swipe pour naviguer (en boucle).
			     La colonne grandit avec son contenu (scroll de page), pas de scroll interne. -->
			<div class="flex flex-col">
				<div class="mb-2 flex items-center justify-between gap-2">
					<button
						class="rounded-lg border border-slate-200 px-3 py-1 text-lg leading-none text-slate-600 hover:bg-slate-50"
						aria-label="Zone précédente"
						onclick={() => go(-1)}>‹</button
					>
					<div class="flex min-w-0 flex-col items-center">
						<span class="truncate text-sm font-semibold">{current.name}</span>
						<div class="mt-0.5 flex gap-1">
							{#each zones as z, i (z.id)}
								<span
									class="h-1.5 w-1.5 rounded-full {i === mobileIndex ? 'bg-indigo-600' : 'bg-slate-300'}"
								></span>
							{/each}
						</div>
					</div>
					<button
						class="rounded-lg border border-slate-200 px-3 py-1 text-lg leading-none text-slate-600 hover:bg-slate-50"
						aria-label="Zone suivante"
						onclick={() => go(1)}>›</button
					>
				</div>
				<div
					role="group"
					aria-label="Colonne {current.name} — glissez pour changer de zone"
					ontouchstart={onTouchStart}
					ontouchend={onTouchEnd}
				>
					<ClassColumn
						{store}
						zoneId={current.id}
						name={current.name}
						capacity={current.capacity}
						items={board[current.id] ?? []}
						filterable={current.unplaced}
						filterOptions={current.unplaced ? levelOptions : []}
						{highlightId}
						{withSet}
						{apartSet}
						{onsort}
						onhover={(id) => (hoveredId = id)}
						{onpin}
						onselect={(s) => (menuStudent = s)}
						dndDisabled
						autoHeight
					/>
				</div>
			</div>
		{/if}
	{:else}
		<p class="text-slate-400">Définissez des niveaux et des classes, puis importez des élèves.</p>
	{/if}
</div>

{#if menuStudent}
	<StudentClassMenu
		student={menuStudent}
		zones={menuZones}
		onpick={moveTo}
		onclose={() => (menuStudent = null)}
	/>
{/if}
