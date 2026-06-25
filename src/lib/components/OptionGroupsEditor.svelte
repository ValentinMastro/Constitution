<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { OptionKind } from '$lib/types';
	import { addGroup, addOption, optionsOf, removeGroup, removeOption } from '$lib/domain/options';

	let { store }: { store: ProjectStore } = $props();

	const groups = $derived([...store.optionGroups.items].sort((a, b) => a.order - b.order));
	const levels = $derived([...store.levels.items].sort((a, b) => a.order - b.order));

	let newGroup = $state('');
	let newKind = $state<OptionKind>('choix');
	// Nouveau groupe : pré-coché sur tous les niveaux par défaut.
	let newLevelIds = $state<string[]>([]);
	$effect(() => {
		newLevelIds = levels.map((l) => l.id);
	});

	let optionDraft = $state<Record<string, string>>({});

	function createGroup() {
		addGroup(store, newGroup, newKind, newLevelIds);
		newGroup = '';
		newLevelIds = levels.map((l) => l.id);
	}

	function toggleNewLevel(levelId: string, on: boolean) {
		newLevelIds = on
			? [...newLevelIds, levelId]
			: newLevelIds.filter((id) => id !== levelId);
	}

	function toggleGroupLevel(g: { id: string; levelIds: string[] }, levelId: string, on: boolean) {
		const levelIds = on ? [...g.levelIds, levelId] : g.levelIds.filter((id) => id !== levelId);
		store.optionGroups.update(g.id, { levelIds });
	}

	function levelsLabel(levelIds: string[]): string {
		const names = levels.filter((l) => levelIds.includes(l.id)).map((l) => l.name);
		return names.length ? names.join(', ') : 'Aucun niveau';
	}

	function createOption(groupId: string) {
		const name = optionDraft[groupId] ?? '';
		if (!name.trim()) return;
		addOption(store, groupId, name);
		optionDraft[groupId] = '';
	}
</script>

<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
	<h2 class="text-lg font-semibold">Groupes d'options</h2>
	<p class="mt-1 text-sm text-slate-500">
		Un <strong>choix obligatoire</strong> impose à l'élève de sélectionner exactement une option du
		groupe (ex. LV2). Une <strong>option facultative</strong> est indépendante.
	</p>

	<div class="mt-4 space-y-3">
		{#each groups as g (g.id)}
			<div class="rounded-lg border border-slate-200 p-3">
				<div class="flex flex-wrap items-center gap-2">
					<input
						class="rounded-lg border border-transparent px-2 py-1 font-semibold hover:border-slate-200 focus:border-indigo-500 focus:outline-none"
						value={g.name}
						onchange={(e) => store.optionGroups.update(g.id, { name: e.currentTarget.value })}
					/>
					<select
						class="rounded-lg border border-slate-300 px-2 py-1 text-sm"
						value={g.kind}
						onchange={(e) =>
							store.optionGroups.update(g.id, { kind: e.currentTarget.value as OptionKind })}
					>
						<option value="choix">Choix obligatoire</option>
						<option value="pure">Option facultative</option>
					</select>
					<details class="relative text-sm">
						<summary
							class="cursor-pointer list-none rounded-lg border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
						>
							{levelsLabel(g.levelIds)} ▾
						</summary>
						<div
							class="absolute z-10 mt-1 max-h-56 w-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
						>
							{#each levels as l (l.id)}
								<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
									<input
										type="checkbox"
										checked={g.levelIds.includes(l.id)}
										onchange={(e) => toggleGroupLevel(g, l.id, e.currentTarget.checked)}
									/>
									{l.name}
								</label>
							{/each}
						</div>
					</details>
					<button
						class="ml-auto rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
						title="Supprimer le groupe"
						onclick={() => removeGroup(store, g.id)}>✕</button
					>
				</div>

				<div class="mt-2 flex flex-wrap items-center gap-2 pl-1">
					{#each optionsOf(store, g.id) as o (o.id)}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
						>
							<input
								class="w-24 bg-transparent focus:outline-none"
								value={o.name}
								onchange={(e) => store.options.update(o.id, { name: e.currentTarget.value })}
							/>
							<button
								class="text-slate-400 hover:text-red-600"
								title="Supprimer l'option"
								onclick={() => removeOption(store, o.id)}>✕</button
							>
						</span>
					{/each}
					<form
						class="inline-flex"
						onsubmit={(e) => {
							e.preventDefault();
							createOption(g.id);
						}}
					>
						<input
							class="w-32 rounded-l-full border border-slate-300 px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none"
							placeholder="+ option"
							bind:value={optionDraft[g.id]}
						/>
						<button
							class="rounded-r-full border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm hover:bg-slate-100"
							type="submit">↵</button
						>
					</form>
				</div>
			</div>
		{/each}
	</div>

	<form
		class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"
		onsubmit={(e) => {
			e.preventDefault();
			createGroup();
		}}
	>
		<input
			class="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
			placeholder="Nom du groupe (ex. LV2, Latin…)"
			bind:value={newGroup}
		/>
		<select class="rounded-lg border border-slate-300 px-2 py-2 text-sm" bind:value={newKind}>
			<option value="choix">Choix obligatoire</option>
			<option value="pure">Option facultative</option>
		</select>
		<details class="relative text-sm">
			<summary
				class="cursor-pointer list-none rounded-lg border border-slate-300 px-2 py-2 text-slate-600 hover:bg-slate-50"
			>
				{levelsLabel(newLevelIds)} ▾
			</summary>
			<div
				class="absolute z-10 mt-1 max-h-56 w-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
			>
				{#each levels as l (l.id)}
					<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
						<input
							type="checkbox"
							checked={newLevelIds.includes(l.id)}
							onchange={(e) => toggleNewLevel(l.id, e.currentTarget.checked)}
						/>
						{l.name}
					</label>
				{/each}
			</div>
		</details>
		<button
			class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
			type="submit">+ Groupe</button
		>
	</form>
</section>
