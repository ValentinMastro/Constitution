<script lang="ts">
	import type { ProjectStore } from '$lib/store/project.svelte';
	import { registry } from '$lib/store/registry.svelte';
	import { sync } from '$lib/sync/webrtc.svelte';

	let { store }: { store: ProjectStore } = $props();

	let open = $state(false);
	let copied = $state(false);
	const meta = $derived(registry.get(store.id));

	const dot = $derived(
		sync.status === 'connected'
			? 'bg-emerald-500'
			: sync.status === 'connecting'
				? 'bg-amber-400'
				: 'bg-slate-300'
	);

	function toggleConnect() {
		if (sync.active) {
			sync.rememberEnabled(store.id, false);
			sync.disconnect();
		} else if (meta) {
			sync.connect(store, meta.shareKey);
		}
	}

	async function copyCode() {
		await navigator.clipboard.writeText(registry.shareCode(store.id));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="relative">
	<button
		class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
		onclick={() => (open = !open)}
	>
		<span class="h-2 w-2 rounded-full {dot}"></span>
		Collaboration
		{#if sync.peers > 0}<span class="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-700">{sync.peers}</span>{/if}
	</button>

	{#if open}
		<div class="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
			<h3 class="font-semibold">Synchronisation temps réel</h3>
			<p class="mt-1 text-xs text-slate-500">
				Connexion P2P chiffrée. Aucune donnée ne transite par un serveur — seules les métadonnées de
				mise en relation passent par la signalisation.
			</p>

			<label class="mt-3 block text-xs font-medium text-slate-600">
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

			<div class="mt-4 border-t border-slate-100 pt-3">
				<p class="text-xs text-slate-500">
					Pour collaborer, transmettez ce code à un autre poste (menu « Rejoindre un projet
					partagé »).
				</p>
				<button
					class="mt-2 w-full rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200"
					onclick={copyCode}
				>
					{copied ? '✓ Code copié' : 'Copier le code de partage'}
				</button>
			</div>
		</div>
	{/if}
</div>
