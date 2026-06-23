<script lang="ts">
	import ClassOptionMatrix from '$lib/components/ClassOptionMatrix.svelte';
	import OptionGroupsEditor from '$lib/components/OptionGroupsEditor.svelte';
	import { project } from '$lib/store/project.svelte';

	const store = $derived(project.current!);
	const levels = $derived([...store.levels.items].sort((a, b) => a.order - b.order));
</script>

<div class="mx-auto max-w-4xl space-y-6">
	<header>
		<h1 class="text-2xl font-bold">Options</h1>
		<p class="mt-1 text-slate-500">
			Créez les groupes d'options puis cochez, pour chaque classe, les options qu'elle propose.
		</p>
	</header>

	<OptionGroupsEditor {store} />

	{#if levels.length > 0}
		<section class="space-y-4">
			<h2 class="text-lg font-semibold">Options offertes par classe</h2>
			{#each levels as level (level.id)}
				<ClassOptionMatrix {store} {level} />
			{/each}
		</section>
	{:else}
		<p class="text-slate-400">Définissez d'abord des niveaux et des classes dans l'étape Structure.</p>
	{/if}
</div>
