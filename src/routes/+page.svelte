<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { registry } from '$lib/store/registry.svelte';
	import { project } from '$lib/store/project.svelte';
	import { sync } from '$lib/sync/webrtc.svelte';
	import { readProjectFile, type ParsedProjectFile } from '$lib/services/projectFile';

	let newName = $state('');
	let joinCode = $state('');
	let joinError = $state('');

	let pending = $state<ParsedProjectFile | null>(null);
	let importError = $state('');

	// Rejoindre directement un projet depuis un lien/QR Code (?join=<code>).
	if (browser) {
		const code = page.url.searchParams.get('join');
		if (code) {
			try {
				const meta = registry.joinShared(code);
				// On arrive sans données (le code ne porte que les métadonnées) : on active
				// d'emblée la collaboration P2P pour que le projet se remplisse dès qu'un pair
				// (le PC qui a partagé) est en ligne sur le même serveur de signalisation.
				if (project.current) sync.connect(project.current, meta.shareKey);
				goto('/structure/');
			} catch (e) {
				joinError = e instanceof Error ? e.message : 'Lien de partage invalide';
				goto('/');
			}
		}
	}

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

	async function pickFile(e: Event) {
		importError = '';
		pending = null;
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			pending = await readProjectFile(file);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Fichier invalide';
		}
	}

	function doImport(mode: 'join' | 'copy') {
		if (!pending) return;
		try {
			const { screen } = registry.importProject(pending, mode);
			pending = null;
			goto(screen || '/structure/');
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Import impossible';
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

	<section class="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h2 class="text-lg font-semibold">Importer un projet</h2>
		<p class="mt-1 text-sm text-slate-500">
			Chargez un fichier de projet exporté (nom, classes, options et élèves). Vous pourrez le
			rejoindre (même projet, synchronisation possible) ou en faire une copie indépendante.
		</p>
		<input
			class="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
			type="file"
			accept=".json,.constitution.json,application/json"
			onchange={pickFile}
		/>
		{#if pending}
			<div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
				<p class="text-sm text-slate-600">
					Projet détecté : <span class="font-semibold text-slate-900">{pending.meta.name}</span>
				</p>
				<div class="mt-3 flex flex-wrap gap-3">
					<button
						class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
						onclick={() => doImport('join')}
					>
						Rejoindre le projet
					</button>
					<button
						class="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
						onclick={() => doImport('copy')}
					>
						Créer une copie
					</button>
				</div>
			</div>
		{/if}
		{#if importError}<p class="mt-2 text-sm text-red-600">{importError}</p>{/if}
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
