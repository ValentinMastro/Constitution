<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { Level } from '$lib/types';
	import {
		classesOfLevel,
		groupsForLevel,
		isOffered,
		optionsOf,
		toggleClassOption
	} from '$lib/domain/options';

	let { store, level }: { store: ProjectStore; level: Level } = $props();

	const classes = $derived(classesOfLevel(store, level.id));
	const groups = $derived(groupsForLevel(store, level.id));
</script>

<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-b border-slate-200">
				<th class="px-4 py-2 text-left font-semibold">{level.name}</th>
				{#each classes as c (c.id)}
					<th class="px-3 py-2 text-center font-semibold">{c.name}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if classes.length === 0}
				<tr><td class="px-4 py-3 text-slate-400" colspan={1 + classes.length}>Aucune classe sur ce niveau.</td></tr>
			{/if}
			{#each groups as g (g.id)}
				<tr class="bg-slate-50">
					<td class="px-4 py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase" colspan={1 + classes.length}>
						{g.name}
						<span class="ml-1 font-normal normal-case {g.kind === 'choix' ? 'text-amber-600' : 'text-slate-400'}">
							· {g.kind === 'choix' ? 'choix obligatoire' : 'facultative'}
						</span>
					</td>
				</tr>
				{#each optionsOf(store, g.id) as o (o.id)}
					<tr class="border-b border-slate-100">
						<td class="px-4 py-2 pl-6">{o.name}</td>
						{#each classes as c (c.id)}
							<td class="px-3 py-2 text-center">
								<input
									type="checkbox"
									class="h-4 w-4 accent-indigo-600"
									checked={isOffered(store, c.id, o.id)}
									onchange={() => toggleClassOption(store, c.id, o.id)}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			{/each}
			{#if groups.length === 0}
				<tr><td class="px-4 py-3 text-slate-400" colspan={1 + classes.length}>Aucune option pour ce niveau.</td></tr>
			{/if}
		</tbody>
	</table>
</div>
