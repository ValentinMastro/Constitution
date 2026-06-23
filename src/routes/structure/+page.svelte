<script lang="ts">
	import LevelCard from '$lib/components/LevelCard.svelte';
	import { addLevel } from '$lib/domain/structure';
	import { project } from '$lib/store/project.svelte';

	const store = $derived(project.current!);
	const levels = $derived([...store.levels.items].sort((a, b) => a.order - b.order));

	let newLevel = $state('');

	function add() {
		addLevel(store, newLevel);
		newLevel = '';
	}
</script>

<div class="mx-auto max-w-4xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Structure de l'établissement</h1>
		<p class="mt-1 text-slate-500">
			Définissez les niveaux puis, pour chacun, le nombre et le nom des classes (capacité par défaut
			30).
		</p>
	</header>

	<div class="space-y-4">
		{#each levels as level (level.id)}
			<LevelCard {store} {level} />
		{/each}
	</div>

	<form
		class="mt-6 flex gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			add();
		}}
	>
		<input
			class="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
			placeholder="Nom du niveau (ex. Futurs 6èmes)"
			bind:value={newLevel}
		/>
		<button
			class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
			type="submit"
		>
			+ Ajouter un niveau
		</button>
	</form>

	{#if levels.length === 0}
		<p class="mt-8 text-center text-slate-400">
			Commencez par ajouter un niveau (ex. « Futurs 6èmes »).
		</p>
	{/if}
</div>
