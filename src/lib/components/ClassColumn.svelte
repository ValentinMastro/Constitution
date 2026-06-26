<script lang="ts">
    import { dndzone, type DndEvent } from "svelte-dnd-action";
    import type { ProjectStore } from "$lib/store/project.svelte";
    import type { OptionItem, Student } from "$lib/types";
    import { classStats } from "$lib/domain/stats";
    import { optionColor, optionsOfClass } from "$lib/domain/options";
    import ClassStats from "./ClassStats.svelte";
    import StudentCard from "./StudentCard.svelte";

    let {
        store,
        zoneId,
        name,
        capacity,
        items,
        highlightId,
        withSet,
        apartSet,
        onsort,
        onhover,
        onpin,
        onselect,
        onOptionClick,
        onOptionDblClick,
        selectedOptionId = null,
        dndDisabled = false,
        autoHeight = false,
        filterable = false,
        filterOptions = [],
    }: {
        store: ProjectStore;
        zoneId: string;
        name: string;
        capacity: number | null;
        items: Student[];
        highlightId: string | null;
        withSet: Set<string>;
        apartSet: Set<string>;
        onsort: (zoneId: string, items: Student[], commit: boolean) => void;
        onhover: (id: string | null) => void;
        onpin: (id: string) => void;
        onselect?: (student: Student) => void;
        // Filtre par option de la colonne classe : simple clic (cette classe) /
        // double clic (toutes les classes). L'état est piloté par le parent.
        onOptionClick?: (optionId: string) => void;
        onOptionDblClick?: (optionId: string) => void;
        selectedOptionId?: string | null;
        // Mobile : désactive le drag&drop et laisse la colonne grandir avec son contenu.
        dndDisabled?: boolean;
        autoHeight?: boolean;
        filterable?: boolean;
        filterOptions?: OptionItem[];
    } = $props();

    const stats = $derived(classStats(items));
    // Options offertes par la classe (la zone « Non affectés » n'en a aucune).
    const options = $derived(optionsOfClass(store, zoneId));

    // Boutons-filtres de la colonne « Non affectés », groupés par catégorie.
    // OU à l'intérieur d'un groupe, ET entre les groupes.
    type FilterDef = {
        key: string;
        label: string;
        group: "academic" | "sex" | "behavior";
        predicate: (s: Student) => boolean;
        color: string;
    };
    const FILTERS: FilterDef[] = [
        {
            key: "A",
            label: "A",
            group: "academic",
            predicate: (s) => s.academic === "A",
            color: "bg-indigo-100 text-indigo-700",
        },
        {
            key: "B",
            label: "B",
            group: "academic",
            predicate: (s) => s.academic === "B",
            color: "bg-indigo-100 text-indigo-700",
        },
        {
            key: "C",
            label: "C",
            group: "academic",
            predicate: (s) => s.academic === "C",
            color: "bg-indigo-100 text-indigo-700",
        },
        {
            key: "D",
            label: "D",
            group: "academic",
            predicate: (s) => s.academic === "D",
            color: "bg-indigo-100 text-indigo-700",
        },
        {
            key: "G",
            label: "G",
            group: "sex",
            predicate: (s) => s.sex === "G",
            color: "bg-blue-100 text-blue-700",
        },
        {
            key: "F",
            label: "F",
            group: "sex",
            predicate: (s) => s.sex === "F",
            color: "bg-pink-100 text-pink-700",
        },
        {
            key: "M",
            label: "M",
            group: "behavior",
            predicate: (s) => s.moteur.startsWith("M"),
            color: "bg-emerald-100 text-emerald-700",
        },
        {
            key: "Z",
            label: "Z",
            group: "behavior",
            predicate: (s) => s.perturbateur.startsWith("Z"),
            color: "bg-amber-100 text-amber-700",
        },
    ];
    const FILTER_GROUPS: FilterDef["group"][] = ["academic", "sex", "behavior"];

    let active = $state<Set<string>>(new Set());
    function toggle(key: string) {
        const next = new Set(active);
        next.has(key) ? next.delete(key) : next.add(key);
        active = next;
    }

    function matches(s: Student): boolean {
        for (const group of FILTER_GROUPS) {
            const groupFilters = FILTERS.filter(
                (f) => f.group === group && active.has(f.key),
            );
            if (
                groupFilters.length &&
                !groupFilters.some((f) => f.predicate(s))
            )
                return false;
        }
        // Options : ET intra (l'élève doit suivre TOUTES les options sélectionnées).
        for (const o of filterOptions) {
            if (active.has(`opt:${o.id}`) && !s.optionIds.includes(o.id))
                return false;
        }
        return true;
    }

    function matchesAll(s: Student): boolean {
        if (filterable && active.size > 0 && !matches(s)) return false;
        if (selectedOptionId && !s.optionIds.includes(selectedOptionId))
            return false;
        return true;
    }

    const filtering = $derived(
        (filterable && active.size > 0) || !!selectedOptionId,
    );
    const displayItems = $derived(filtering ? items.filter(matchesAll) : items);
    // Éléments masqués par le filtre, à réinjecter pour ne pas les perdre au drag&drop.
    const hidden = $derived(filtering ? items.filter((s) => !matchesAll(s)) : []);

    // Distinction simple/double clic sur un badge d'option (clic simple = cette
    // classe, double = toutes). On temporise le simple clic le temps de détecter
    // un éventuel double clic.
    let clickTimer: ReturnType<typeof setTimeout> | null = null;
    function onBadgeClick(optionId: string) {
        if (clickTimer) return;
        clickTimer = setTimeout(() => {
            clickTimer = null;
            onOptionClick?.(optionId);
        }, 220);
    }
    function onBadgeDblClick(optionId: string) {
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
        }
        onOptionDblClick?.(optionId);
    }

    function consider(e: CustomEvent<DndEvent<Student>>) {
        onsort(zoneId, [...e.detail.items, ...hidden], false);
    }
    function finalize(e: CustomEvent<DndEvent<Student>>) {
        onsort(zoneId, [...e.detail.items, ...hidden], true);
    }
</script>

<div
    class="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50 {autoHeight
        ? ''
        : 'h-full'}"
>
    <header class="border-b border-slate-200 px-2 py-1">
        <div class="flex items-center gap-1">
            <span class="min-w-0 flex-1 truncate font-semibold">{name}</span>
            {#if options.length}
                <div class="flex flex-wrap justify-end gap-0.5">
                    {#each options as option (option.id)}
                        <button
                            type="button"
                            class="rounded border-[0.25px] px-1 text-xs leading-tight {optionColor(
                                option.name,
                            )} {selectedOptionId === option.id
                                ? 'ring-1 ring-slate-900/40'
                                : ''}"
                            title="Clic : n'afficher que les élèves de cette option dans la classe · Double-clic : sur toutes les classes"
                            onclick={() => onBadgeClick(option.id)}
                            ondblclick={() => onBadgeDblClick(option.id)}
                            >{option.name}</button
                        >
                    {/each}
                </div>
            {/if}
        </div>
        {#if filterable}
            <div class="mt-0.5 flex flex-wrap items-center gap-0.5">
                {#each FILTER_GROUPS as group, i (group)}
                    {#if i > 0}<span class="w-1"></span>{/if}
                    {#each FILTERS.filter((f) => f.group === group) as f (f.key)}
                        <button
                            class="rounded px-1 text-xs leading-tight {active.has(
                                f.key,
                            )
                                ? f.color
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}"
                            onclick={() => toggle(f.key)}>{f.label}</button
                        >
                    {/each}
                {/each}
                {#each filterOptions as o (o.id)}
                    <button
                        class="rounded px-1 text-xs leading-tight {active.has(
                            `opt:${o.id}`,
                        )
                            ? optionColor(o.name)
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}"
                        onclick={() => toggle(`opt:${o.id}`)}>{o.name}</button
                    >
                {/each}
            </div>
        {/if}
        {#if capacity !== null}
            <div class="mt-0.5">
                <ClassStats
                    {stats}
                    {capacity}
                    selected={selectedOptionId ? displayItems.length : null}
                />
            </div>
        {:else if filtering}
            <div class="mt-0.5 text-xs text-slate-400">
                {displayItems.length} / {items.length} élève(s)
            </div>
        {:else}
            <div class="mt-0.5 text-xs text-slate-400">
                {stats.total} élève(s)
            </div>
        {/if}
    </header>

    <div
        class="space-y-0.5 p-1.5 {autoHeight ? '' : 'flex-1 overflow-y-auto'}"
        use:dndzone={{
            items: displayItems,
            flipDurationMs: 150,
            dragDisabled: dndDisabled,
            dropTargetStyle: { outline: "2px dashed #6366f1" },
        }}
        onconsider={consider}
        onfinalize={finalize}
    >
        {#each displayItems as s (s.id)}
            <StudentCard
                {store}
                student={s}
                {highlightId}
                {withSet}
                {apartSet}
                {onhover}
                {onpin}
                {onselect}
            />
        {/each}
    </div>
</div>
