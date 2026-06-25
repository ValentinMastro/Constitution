<script lang="ts">
	import type { Student } from '$lib/types';
	import { studentLabel } from '$lib/domain/students';

	type Zone = {
		id: string;
		name: string;
		count: number;
		capacity: number | null;
		canAccept: boolean;
	};

	let {
		student,
		zones,
		onpick,
		onclose
	}: {
		student: Student;
		zones: Zone[];
		onpick: (zoneId: string) => void;
		onclose: () => void;
	} = $props();
</script>

<!-- Feuille remontant du bas (mobile) : choisir la classe de destination. -->
<div class="fixed inset-0 z-50 md:hidden">
	<button
		type="button"
		class="absolute inset-0 w-full bg-black/40"
		aria-label="Fermer"
		onclick={onclose}
	></button>
	<div class="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-3 shadow-xl">
		<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300"></div>
		<p class="mb-2 px-1 text-sm">
			Déplacer <span class="font-semibold">{studentLabel(student)}</span> vers…
		</p>
		<div class="space-y-1">
			{#each zones as z (z.id)}
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left {z.canAccept
						? 'border-slate-200 hover:bg-slate-50'
						: 'border-red-300 bg-red-50 text-red-700'}"
					onclick={() => onpick(z.id)}
				>
					<span class="flex items-center gap-1.5 font-medium">
						{#if !z.canAccept}<span aria-label="incompatible">⚠</span>{/if}
						{z.name}
					</span>
					<span class="text-xs {z.canAccept ? 'text-slate-400' : 'text-red-500'}">
						{#if !z.canAccept}options incompatibles · {/if}{z.count}{#if z.capacity !== null}/{z.capacity}{/if}
					</span>
				</button>
			{/each}
		</div>
	</div>
</div>
