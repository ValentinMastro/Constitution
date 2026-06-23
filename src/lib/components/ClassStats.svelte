<script lang="ts">
	import type { ClassStats } from '$lib/domain/stats';

	let { stats, capacity }: { stats: ClassStats; capacity: number } = $props();
	const over = $derived(stats.total > capacity);
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
	<span class="font-semibold {over ? 'text-red-600' : 'text-slate-600'}">
		{stats.total}/{capacity}
	</span>
	<span class="flex gap-1">
		<span class="rounded bg-pink-100 px-1 text-pink-700">F {stats.filles}</span>
		<span class="rounded bg-blue-100 px-1 text-blue-700">G {stats.garcons}</span>
	</span>
	<span class="flex gap-0.5 text-slate-600">
		<span title="Niveau A">A{stats.academic.A}</span>
		<span title="Niveau B">B{stats.academic.B}</span>
		<span title="Niveau C">C{stats.academic.C}</span>
		<span title="Niveau D">D{stats.academic.D}</span>
	</span>
	<span class="flex gap-1">
		<span class="rounded bg-emerald-100 px-1 text-emerald-700" title="Moteur">M {stats.moteur}</span>
		<span class="rounded bg-amber-100 px-1 text-amber-700" title="Perturbateur">Z {stats.perturbateur}</span>
	</span>
</div>
