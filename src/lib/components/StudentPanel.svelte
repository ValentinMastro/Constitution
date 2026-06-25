<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import type { Academic, LinkType, Moteur, Perturbateur, Sex, Student } from '$lib/types';
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

	// Attributs de base : édités dans le tableau sur PC, ici sur mobile (section md:hidden).
	const levels = $derived([...store.levels.items].sort((a, b) => a.order - b.order));
	const SEX: Sex[] = ['F', 'G'];
	const ACAD: Academic[] = ['A', 'B', 'C', 'D'];
	const MOTEUR: Moteur[] = ['M', 'M+'];
	const PERTURB: Perturbateur[] = ['Z', 'Z+'];
</script>

<aside
	class="fixed inset-0 z-50 flex w-full flex-col border-slate-200 bg-white md:relative md:inset-auto md:z-auto md:h-full md:w-80 md:border-l"
>
	<header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
		<div>
			<p class="font-semibold">{studentLabel(student)}</p>
			<p class="text-xs text-slate-400">{store.levels.get(student.levelId)?.name}</p>
		</div>
		<button class="rounded px-2 py-1 text-slate-400 hover:bg-slate-100" onclick={onclose}>✕</button>
	</header>

	<div class="flex-1 space-y-5 overflow-auto p-4">
		<!-- Identité : sur PC ces champs sont dans le tableau, ici uniquement sur mobile. -->
		<section class="md:hidden">
			<h3 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Identité</h3>
			<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
				<label class="col-span-2 flex flex-col gap-1">
					<span class="text-xs text-slate-500">Nom</span>
					<input
						class="rounded border border-slate-300 px-2 py-1"
						value={student.lastName}
						onchange={(e) => store.students.update(student.id, { lastName: e.currentTarget.value })}
					/>
				</label>
				<label class="col-span-2 flex flex-col gap-1">
					<span class="text-xs text-slate-500">Prénom</span>
					<input
						class="rounded border border-slate-300 px-2 py-1"
						value={student.firstName}
						onchange={(e) => store.students.update(student.id, { firstName: e.currentTarget.value })}
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-slate-500">Sexe</span>
					<select
						class="rounded border border-slate-300 px-2 py-1"
						value={student.sex}
						onchange={(e) => store.students.update(student.id, { sex: e.currentTarget.value as Sex })}
					>
						<option value=""></option>
						{#each SEX as v (v)}<option value={v}>{v}</option>{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-slate-500">Niveau scolaire</span>
					<select
						class="rounded border border-slate-300 px-2 py-1"
						value={student.academic}
						onchange={(e) =>
							store.students.update(student.id, { academic: e.currentTarget.value as Academic })}
					>
						<option value=""></option>
						{#each ACAD as v (v)}<option value={v}>{v}</option>{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-slate-500">Moteur</span>
					<select
						class="rounded border border-slate-300 px-2 py-1"
						value={student.moteur}
						onchange={(e) =>
							store.students.update(student.id, { moteur: e.currentTarget.value as Moteur })}
					>
						<option value=""></option>
						{#each MOTEUR as v (v)}<option value={v}>{v}</option>{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-slate-500">Perturbateur</span>
					<select
						class="rounded border border-slate-300 px-2 py-1"
						value={student.perturbateur}
						onchange={(e) =>
							store.students.update(student.id, {
								perturbateur: e.currentTarget.value as Perturbateur
							})}
					>
						<option value=""></option>
						{#each PERTURB as v (v)}<option value={v}>{v}</option>{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-slate-500">Classe d'origine</span>
					<input
						class="rounded border border-slate-300 px-2 py-1"
						value={student.originClass}
						onchange={(e) =>
							store.students.update(student.id, { originClass: e.currentTarget.value })}
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-slate-500">Niveau</span>
					<select
						class="rounded border border-slate-300 px-2 py-1"
						value={student.levelId}
						onchange={(e) => store.students.update(student.id, { levelId: e.currentTarget.value })}
					>
						{#each levels as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
					</select>
				</label>
			</div>
		</section>

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
