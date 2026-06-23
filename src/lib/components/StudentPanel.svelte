<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { LinkType, Student } from '$lib/types';
	import {
		addLink,
		applicableOptions,
		partnersOf,
		removeLink,
		setChoiceOption,
		studentLabel,
		toggleStudentOption,
		hasLink
	} from '$lib/domain/students';

	let {
		store,
		student,
		onclose
	}: { store: ProjectStore; student: Student; onclose: () => void } = $props();

	const groups = $derived(applicableOptions(store, student.levelId));

	// Camarades du même niveau (cible possible des liens).
	const peers = $derived(
		store.students.items
			.filter((s) => s.levelId === student.levelId && s.id !== student.id)
			.sort((a, b) => studentLabel(a).localeCompare(studentLabel(b)))
	);

	const withIds = $derived(partnersOf(store, student.id, 'with'));
	const apartIds = $derived(partnersOf(store, student.id, 'apart'));

	const selectablePeers = $derived(
		peers.filter((p) => !hasLink(store, student.id, p.id))
	);

	function addPartner(type: LinkType, e: Event) {
		const id = (e.currentTarget as HTMLSelectElement).value;
		if (id) addLink(store, student.id, id, type);
		(e.currentTarget as HTMLSelectElement).value = '';
	}

	function chosenInGroup(groupOptions: { id: string }[]): string {
		return groupOptions.find((o) => student.optionIds.includes(o.id))?.id ?? '';
	}

	const nameOf = (id: string) => studentLabel(store.students.get(id) ?? ({} as Student));
</script>

<aside class="flex h-full w-80 flex-col border-l border-slate-200 bg-white">
	<header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
		<div>
			<p class="font-semibold">{studentLabel(student)}</p>
			<p class="text-xs text-slate-400">{store.levels.get(student.levelId)?.name}</p>
		</div>
		<button class="rounded px-2 py-1 text-slate-400 hover:bg-slate-100" onclick={onclose}>✕</button>
	</header>

	<div class="flex-1 space-y-5 overflow-auto p-4">
		<section>
			<h3 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Options</h3>
			{#if groups.length === 0}
				<p class="mt-1 text-sm text-slate-400">Aucune option pour ce niveau.</p>
			{/if}
			{#each groups as { group, options } (group.id)}
				<div class="mt-2">
					<p class="text-sm font-medium">
						{group.name}
						<span class="text-xs {group.kind === 'choix' ? 'text-amber-600' : 'text-slate-400'}">
							{group.kind === 'choix' ? '(obligatoire)' : '(facultative)'}
						</span>
					</p>
					{#if group.kind === 'choix'}
						<select
							class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
							value={chosenInGroup(options)}
							onchange={(e) =>
								setChoiceOption(store, student, group.id, e.currentTarget.value || null)}
						>
							<option value="">— non choisi —</option>
							{#each options as o (o.id)}
								<option value={o.id}>{o.name}</option>
							{/each}
						</select>
					{:else}
						<div class="mt-1 flex flex-wrap gap-2">
							{#each options as o (o.id)}
								<label class="inline-flex items-center gap-1 text-sm">
									<input
										type="checkbox"
										class="accent-indigo-600"
										checked={student.optionIds.includes(o.id)}
										onchange={() => toggleStudentOption(store, student, o.id)}
									/>
									{o.name}
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</section>

		<section>
			<h3 class="text-sm font-semibold tracking-wide text-emerald-700 uppercase">Être avec</h3>
			<ul class="mt-1 space-y-1">
				{#each withIds as id (id)}
					<li class="flex items-center justify-between rounded bg-emerald-50 px-2 py-1 text-sm">
						{nameOf(id)}
						<button
							class="text-emerald-600 hover:text-red-600"
							onclick={() => removeLink(store, hasLink(store, student.id, id)!.id)}>✕</button
						>
					</li>
				{/each}
			</ul>
			<select
				class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
				onchange={(e) => addPartner('with', e)}
			>
				<option value="">+ ajouter un camarade…</option>
				{#each selectablePeers as p (p.id)}
					<option value={p.id}>{studentLabel(p)}</option>
				{/each}
			</select>
		</section>

		<section>
			<h3 class="text-sm font-semibold tracking-wide text-rose-700 uppercase">Séparer de</h3>
			<ul class="mt-1 space-y-1">
				{#each apartIds as id (id)}
					<li class="flex items-center justify-between rounded bg-rose-50 px-2 py-1 text-sm">
						{nameOf(id)}
						<button
							class="text-rose-600 hover:text-red-600"
							onclick={() => removeLink(store, hasLink(store, student.id, id)!.id)}>✕</button
						>
					</li>
				{/each}
			</ul>
			<select
				class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
				onchange={(e) => addPartner('apart', e)}
			>
				<option value="">+ séparer d'un camarade…</option>
				{#each selectablePeers as p (p.id)}
					<option value={p.id}>{studentLabel(p)}</option>
				{/each}
			</select>
		</section>
	</div>
</aside>
