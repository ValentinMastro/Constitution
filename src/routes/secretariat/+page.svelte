<script lang="ts">
	import { goto } from '$app/navigation';
	import { project } from '$lib/store/project.svelte';
	import { registry } from '$lib/store/registry.svelte';
	import { exportTemplate } from '$lib/services/odsExportTemplate';
	import { applyImport, readOdsFile, type ImportResult } from '$lib/services/odsImport';

	const store = $derived(project.current!);
	const meta = $derived(registry.get(store.id));
	const levels = $derived([...store.levels.items].sort((a, b) => a.order - b.order));

	let preview = $state<ImportResult | null>(null);
	let fileName = $state('');
	let importError = $state('');

	function download() {
		exportTemplate(store, meta?.name ?? 'projet');
	}

	async function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		importError = '';
		fileName = file.name;
		try {
			preview = await readOdsFile(store, file);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Lecture impossible';
			preview = null;
		}
	}

	function confirmImport() {
		if (!preview) return;
		const total = preview.students.length;
		if (store.students.size > 0 && !confirm(`Remplacer les ${store.students.size} élèves existants par les ${total} importés ? Les liens seront réinitialisés.`))
			return;
		applyImport(store, preview.students);
		preview = null;
		goto('/eleves/');
	}
</script>

<div class="mx-auto max-w-3xl space-y-6">
	<header>
		<h1 class="text-2xl font-bold">Secrétariat — tableau .ods</h1>
		<p class="mt-1 text-slate-500">
			Exportez le tableau à remplir par le secrétariat (une feuille par niveau), puis réimportez-le
			une fois complété.
		</p>
	</header>

	<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<h2 class="text-lg font-semibold">1. Exporter le modèle</h2>
		<p class="mt-1 text-sm text-slate-500">
			Le fichier contient une feuille par niveau avec les colonnes : nom, prénom, sexe, niveau
			scolaire, profil, classe d'origine, une colonne par option, et « Future classe » (laissée
			vide). Une feuille « Référence » rappelle les valeurs autorisées.
		</p>

		{#if levels.length === 0}
			<p class="mt-4 text-amber-600">Définissez d'abord des niveaux dans l'étape Structure.</p>
		{:else}
			<ul class="mt-3 text-sm text-slate-600">
				{#each levels as l (l.id)}
					<li>• {l.name}</li>
				{/each}
			</ul>
			<button
				class="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
				onclick={download}
			>
				⬇ Télécharger le modèle .ods
			</button>
		{/if}
	</section>

	<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<h2 class="text-lg font-semibold">2. Importer le tableau complété</h2>
		<p class="mt-1 text-sm text-slate-500">
			Sélectionnez le fichier .ods rempli. Les élèves de tous les niveaux seront importés (remplace
			les élèves existants).
		</p>

		<label
			class="mt-3 inline-block cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium hover:bg-slate-100"
		>
			Choisir un fichier .ods
			<input type="file" accept=".ods" class="hidden" onchange={onFile} />
		</label>
		{#if fileName}<span class="ml-2 text-sm text-slate-500">{fileName}</span>{/if}

		{#if importError}
			<p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>
		{/if}

		{#if preview}
			<div class="mt-4 rounded-lg border border-slate-200 p-3">
				<p class="font-medium">
					{preview.students.length} élève(s) détecté(s) :
				</p>
				<ul class="mt-1 text-sm text-slate-600">
					{#each preview.perLevel as p (p.levelName)}
						<li>• {p.levelName} : {p.count}</li>
					{/each}
				</ul>
				{#if preview.warnings.length}
					<details class="mt-2 text-sm text-amber-700">
						<summary class="cursor-pointer">{preview.warnings.length} avertissement(s)</summary>
						<ul class="mt-1 list-disc pl-5">
							{#each preview.warnings as w (w)}<li>{w}</li>{/each}
						</ul>
					</details>
				{/if}
				<button
					class="mt-3 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
					disabled={preview.students.length === 0}
					onclick={confirmImport}
				>
					Importer {preview.students.length} élève(s)
				</button>
			</div>
		{/if}
	</section>
</div>
