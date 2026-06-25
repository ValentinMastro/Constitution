<script lang="ts">
	import QRCode from 'qrcode';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ProjectStore } from '$lib/store/project.svelte';
	import { registry } from '$lib/store/registry.svelte';
	import { sync } from '$lib/sync/webrtc.svelte';
	import { exportProjectFile } from '$lib/services/projectFile';

	let { store }: { store: ProjectStore } = $props();

	let open = $state(false);
	let copied = $state(false);
	let canvas = $state<HTMLCanvasElement | null>(null);
	const meta = $derived(registry.get(store.id));

	const dot = $derived(
		sync.status === 'connected'
			? 'bg-emerald-500'
			: sync.status === 'connecting'
				? 'bg-amber-400'
				: 'bg-slate-300'
	);

	// URL de partage encodée dans le QR Code : ouvre l'app et rejoint le projet.
	const joinUrl = $derived(
		typeof location !== 'undefined'
			? `${location.origin}/?join=${encodeURIComponent(registry.shareCode(store.id))}`
			: ''
	);

	// (Re)dessine le QR Code quand le panneau est ouvert.
	$effect(() => {
		if (open && canvas && joinUrl) {
			QRCode.toCanvas(canvas, joinUrl, { width: 192, margin: 1 }).catch(() => {});
		}
	});

	function exportProject() {
		if (meta) exportProjectFile(store, meta, page.url.pathname);
	}

	function toggleConnect() {
		if (sync.active) {
			sync.rememberEnabled(store.id, false);
			sync.disconnect();
		} else if (meta) {
			sync.connect(store, meta.shareKey);
		}
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(registry.shareCode(store.id));
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}

	function closeProject() {
		registry.close();
		goto('/');
	}
</script>

<button
	class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
	onclick={() => (open = true)}
	title="Menu du projet"
>
	<span class="h-2 w-2 rounded-full {dot}"></span>
	Menu
	{#if sync.peers > 0}<span class="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-700"
			>{sync.peers}</span
		>{/if}
</button>

{#if open}
	<!-- Fond cliquable pour fermer -->
	<button class="fixed inset-0 z-40 bg-slate-900/30" aria-label="Fermer le menu" onclick={() => (open = false)}
	></button>

	<aside
		class="fixed inset-y-0 right-0 z-50 flex w-96 max-w-[90vw] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
	>
		<header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
			<h2 class="text-base font-semibold">Projet</h2>
			<button
				class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
				aria-label="Fermer"
				onclick={() => (open = false)}
			>
				✕
			</button>
		</header>

		<div class="flex-1 space-y-6 p-4">
			<!-- Export -->
			<section>
				<h3 class="text-sm font-semibold text-slate-700">Exporter le projet</h3>
				<p class="mt-1 text-xs text-slate-500">
					Télécharge un fichier complet (nom, classes, options, élèves) que vous pourrez réimporter
					ou archiver.
				</p>
				<button
					class="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
					onclick={exportProject}
				>
					⬇ Exporter le projet
				</button>
			</section>

			<!-- Partage / collaboration -->
			<section class="border-t border-slate-100 pt-5">
				<h3 class="text-sm font-semibold text-slate-700">Partage et collaboration</h3>
				<p class="mt-1 text-xs text-slate-500">
					Scannez ce QR Code depuis un téléphone (même réseau Wi-Fi) pour ouvrir le projet et le
					rejoindre.
				</p>
				<div class="mt-3 flex justify-center">
					<canvas bind:this={canvas} class="rounded-lg border border-slate-200"></canvas>
				</div>

				<label class="mt-4 block text-xs font-medium text-slate-600">
					Serveur de signalisation
					<input
						class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm font-normal"
						value={sync.signalingUrl}
						disabled={sync.active}
						onchange={(e) => sync.setSignaling(e.currentTarget.value)}
					/>
				</label>

				<div class="mt-3 flex items-center justify-between">
					<span class="text-sm">
						{#if sync.status === 'connected'}
							<span class="text-emerald-600">Connecté · {sync.peers} pair(s)</span>
						{:else if sync.status === 'connecting'}
							<span class="text-amber-600">Connexion…</span>
						{:else}
							<span class="text-slate-400">Hors ligne</span>
						{/if}
					</span>
					<button
						class="rounded-lg px-3 py-1 text-sm font-medium text-white {sync.active
							? 'bg-rose-600 hover:bg-rose-700'
							: 'bg-indigo-600 hover:bg-indigo-700'}"
						onclick={toggleConnect}
					>
						{sync.active ? 'Déconnecter' : 'Connecter'}
					</button>
				</div>

				{#if sync.error}
					<p class="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{sync.error}</p>
				{/if}

				<button
					class="mt-3 w-full rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200"
					onclick={copyCode}
				>
					{copied ? '✓ Code copié' : 'Copier le code de partage'}
				</button>
			</section>

			<!-- Fermer -->
			<section class="border-t border-slate-100 pt-5">
				<button
					class="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					onclick={closeProject}
				>
					Fermer le projet
				</button>
			</section>
		</div>
	</aside>
{/if}
