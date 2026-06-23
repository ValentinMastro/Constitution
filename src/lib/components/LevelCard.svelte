<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { Level } from '$lib/types';
	import {
		addClass,
		classesOf,
		generateClasses,
		moveLevel,
		removeClass,
		removeLevel,
		type NamingScheme
	} from '$lib/domain/structure';

	let { store, level }: { store: ProjectStore; level: Level } = $props();

	const classes = $derived(classesOf(store, level.id));

	let genCount = $state(4);
	let genScheme = $state<NamingScheme>('letters');

	function confirmRemove() {
		if (confirm(`Supprimer le niveau « ${level.name} » et ses classes ?`))
			removeLevel(store, level.id);
	}
</script>

<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<header class="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
		<input
			class="flex-1 rounded-lg border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
			value={level.name}
			onchange={(e) => store.levels.update(level.id, { name: e.currentTarget.value })}
		/>
		<button
			class="rounded px-2 py-1 text-slate-400 hover:bg-slate-100"
			title="Monter"
			onclick={() => moveLevel(store, level.id, -1)}>↑</button
		>
		<button
			class="rounded px-2 py-1 text-slate-400 hover:bg-slate-100"
			title="Descendre"
			onclick={() => moveLevel(store, level.id, 1)}>↓</button
		>
		<button
			class="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
			title="Supprimer le niveau"
			onclick={confirmRemove}>✕</button
		>
	</header>

	<div class="p-4">
		{#if classes.length === 0}
			<p class="text-sm text-slate-400">Aucune classe. Générez-en ou ajoutez-les une à une.</p>
		{:else}
			<ul class="flex flex-wrap gap-2">
				{#each classes as c (c.id)}
					<li class="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
						<input
							class="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-center font-medium hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none"
							value={c.name}
							onchange={(e) => store.classes.update(c.id, { name: e.currentTarget.value })}
						/>
						<span class="text-slate-300">·</span>
						<input
							class="w-12 rounded border border-transparent bg-transparent px-1 py-0.5 text-center text-sm text-slate-500 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none"
							type="number"
							min="1"
							value={c.capacity}
							title="Capacité"
							onchange={(e) =>
								store.classes.update(c.id, { capacity: Math.max(1, +e.currentTarget.value || 1) })}
						/>
						<button
							class="ml-1 rounded px-1 text-slate-300 hover:text-red-600"
							title="Supprimer la classe"
							onclick={() => removeClass(store, c.id)}>✕</button
						>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
			<button
				class="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
				onclick={() => addClass(store, level.id, '')}
			>
				+ Ajouter une classe
			</button>

			<div class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
				<span class="text-slate-500">Générer</span>
				<input
					class="w-14 rounded border border-slate-300 px-1 py-0.5 text-center"
					type="number"
					min="1"
					max="6"
					bind:value={genCount}
				/>
				<span class="text-slate-500">classes</span>
				<select class="rounded border border-slate-300 px-1 py-0.5" bind:value={genScheme}>
					<option value="letters">A, B, C…</option>
					<option value="numbers">1, 2, 3…</option>
				</select>
				<button
					class="rounded bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-700"
					onclick={() => generateClasses(store, level.id, Math.max(1, genCount), genScheme)}
				>
					OK
				</button>
			</div>
		</div>
	</div>
</section>
