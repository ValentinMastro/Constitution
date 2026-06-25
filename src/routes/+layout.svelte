<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import { steps } from '$lib/nav';
	import SyncWidget from '$lib/components/SyncWidget.svelte';
	import { project } from '$lib/store/project.svelte';
	import { registry } from '$lib/store/registry.svelte';
	import { sync } from '$lib/sync/webrtc.svelte';

	let { children } = $props();

	// Menu latéral rétractable (préférence mémorisée), pour gagner de la place.
	let navCollapsed = $state(browser && localStorage.getItem('navCollapsed') === '1');
	function toggleNav() {
		navCollapsed = !navCollapsed;
		if (browser) localStorage.setItem('navCollapsed', navCollapsed ? '1' : '0');
	}

	// Réouvre automatiquement le dernier projet après un rechargement (SPA),
	// et rétablit la collaboration P2P si elle était active pour ce projet.
	if (browser && !project.current) {
		const id = registry.lastId;
		const meta = id ? registry.get(id) : undefined;
		if (id && meta) {
			const store = registry.open(id);
			if (sync.isEnabled(id)) sync.connect(store, meta.shareKey);
		}
	}

	// Garde de route : sans projet ouvert, retour à l'accueil.
	$effect(() => {
		if (browser && !project.current && page.url.pathname !== '/') goto('/');
	});

	const current = $derived(project.current);
	const meta = $derived(current ? registry.get(current.id) : undefined);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Constitution des classes</title>
</svelte:head>

{#if current}
	<div
		class="grid h-screen grid-rows-[auto_1fr] {navCollapsed
			? 'grid-cols-[3.5rem_1fr]'
			: 'grid-cols-[15rem_1fr]'}"
	>
		<header
			class="col-span-2 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2"
		>
			<div class="flex items-baseline gap-3">
				<button
					class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
					title={navCollapsed ? 'Déplier le menu' : 'Replier le menu'}
					aria-label={navCollapsed ? 'Déplier le menu' : 'Replier le menu'}
					onclick={toggleNav}
				>
					{#if navCollapsed}»{:else}«{/if}
				</button>
				<span class="text-sm font-semibold text-slate-500">Constitution des classes</span>
				<span class="text-base font-bold">{current.estName || meta?.name}</span>
			</div>
			<div class="flex items-center gap-2">
				<SyncWidget store={current} />
				<button
					class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
					onclick={() => {
						registry.close();
						goto('/');
					}}
				>
					Fermer le projet
				</button>
			</div>
		</header>

		<nav class="border-r border-slate-200 bg-white {navCollapsed ? 'p-2' : 'p-3'}">
			<ul class="space-y-1">
				{#each steps as s (s.href)}
					{@const active = page.url.pathname.startsWith(s.href)}
					<li>
						<a
							href={s.href}
							title={navCollapsed ? `${s.label} — ${s.hint}` : undefined}
							class="block rounded-lg transition-colors {navCollapsed
								? 'p-1'
								: 'px-3 py-2'} {active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}"
						>
							<span class="flex items-center gap-2 {navCollapsed ? 'justify-center' : ''}">
								<span
									class="grid h-6 w-6 place-items-center rounded-full text-xs font-bold {active
										? 'bg-white/20'
										: 'bg-slate-200 text-slate-600'}"
								>
									{s.num}
								</span>
								{#if !navCollapsed}<span class="font-medium">{s.label}</span>{/if}
							</span>
							{#if !navCollapsed}
								<span class="ml-8 block text-xs {active ? 'text-indigo-100' : 'text-slate-400'}">
									{s.hint}
								</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<main class="overflow-auto p-6">
			{#if current.loaded}
				{@render children()}
			{:else}
				<p class="text-slate-400">Chargement du projet…</p>
			{/if}
		</main>
	</div>
{:else}
	<main class="min-h-screen">
		{@render children()}
	</main>
{/if}
