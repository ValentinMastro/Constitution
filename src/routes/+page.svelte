<script lang="ts">
	import { goto } from '$app/navigation';
	import { registry } from '$lib/store/registry.svelte';

	let newName = $state('');
	let joinCode = $state('');
	let joinError = $state('');

	function create() {
		registry.create(newName);
		newName = '';
		goto('/structure/');
	}

	function join() {
		joinError = '';
		try {
			registry.joinShared(joinCode);
			joinCode = '';
			goto('/structure/');
		} catch (e) {
			joinError = e instanceof Error ? e.message : 'Code invalide';
		}
	}

	function open(id: string) {
		registry.open(id);
		goto('/structure/');
	}

	function remove(id: string, name: string) {
		if (confirm(`Supprimer définitivement le projet « ${name} » et toutes ses données ?`))
			registry.remove(id);
	}

	const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('fr-FR');
</script>

<div class="mx-auto max-w-2xl px-6 py-16">
	<h1 class="text-3xl font-bold text-slate-900">Constitution des classes</h1>
	<p class="mt-2 text-slate-500">
		Créez un projet d'établissement ou ouvrez-en un existant. Toutes les données restent sur cet
		ordinateur.
	</p>

	<section class="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h2 class="text-lg font-semibold">Nouveau projet</h2>
		<form
			class="mt-4 flex gap-3"
			onsubmit={(e) => {
				e.preventDefault();
				create();
			}}
		>
			<input
				class="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
				placeholder="Nom de l'établissement"
				bind:value={newName}
			/>
			<button
				class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
				type="submit"
			>
				Créer
			</button>
		</form>
	</section>

	<section class="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h2 class="text-lg font-semibold">Rejoindre un projet partagé</h2>
		<p class="mt-1 text-sm text-slate-500">
			Collez le code de partage fourni par un collègue. Les données arriveront par la
			synchronisation temps réel une fois la collaboration activée.
		</p>
		<form
			class="mt-4 flex gap-3"
			onsubmit={(e) => {
				e.preventDefault();
				join();
			}}
		>
			<input
				class="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
				placeholder="Code de partage"
				bind:value={joinCode}
			/>
			<button
				class="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800"
				type="submit"
			>
				Rejoindre
			</button>
		</form>
		{#if joinError}<p class="mt-2 text-sm text-red-600">{joinError}</p>{/if}
	</section>

	{#if registry.list.length > 0}
		<section class="mt-8">
			<h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Projets existants</h2>
			<ul class="mt-3 space-y-2">
				{#each registry.list as m (m.id)}
					<li
						class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
					>
						<button class="flex-1 text-left" onclick={() => open(m.id)}>
							<span class="font-medium text-slate-900">{m.name}</span>
							<span class="block text-xs text-slate-400">Créé le {fmtDate(m.createdAt)}</span>
						</button>
						<div class="flex items-center gap-2">
							<button
								class="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
								onclick={() => open(m.id)}
							>
								Ouvrir
							</button>
							<button
								class="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
								onclick={() => remove(m.id, m.name)}
								title="Supprimer"
							>
								✕
							</button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
