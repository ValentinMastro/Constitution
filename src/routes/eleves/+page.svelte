<script lang="ts">
    import { MediaQuery } from "svelte/reactivity";
    import StudentPanel from "$lib/components/StudentPanel.svelte";
    import { project } from "$lib/store/project.svelte";
    import type {
        Academic,
        Moteur,
        Perturbateur,
        Sex,
        Student,
    } from "$lib/types";
    import {
        addStudent,
        optionNames,
        removeStudent,
        studentLabel,
    } from "$lib/domain/students";

    // Vue desktop/mobile pilotée par une vraie media query : on ne monte qu'UNE
    // seule des deux vues (sinon les ~600 lignes du tableau ET les ~600 cartes
    // mobile sont créées en même temps, doublant le coût de rendu).
    const desktop = new MediaQuery("min-width: 768px");
    const store = $derived(project.current!);
    const levels = $derived(
        [...store.levels.items].sort((a, b) => a.order - b.order),
    );

    // Compteurs de liens par élève, calculés une fois (au lieu de O(élèves × liens)).
    const linkCounts = $derived.by(() => {
        const m = new Map<string, { with: number; apart: number }>();
        const bump = (id: string, t: "with" | "apart") => {
            const e = m.get(id) ?? { with: 0, apart: 0 };
            e[t]++;
            m.set(id, e);
        };
        for (const l of store.links.items) {
            if (l.type !== "with" && l.type !== "apart") continue;
            bump(l.a, l.type);
            bump(l.b, l.type);
        }
        return m;
    });

    // Élèves ne respectant pas leurs options obligatoires : pour chaque groupe
    // « choix » applicable à leur niveau, il faut exactement une option choisie.
    // Précalculé en une passe (au lieu de revérifier les groupes par ligne).
    const invalidStudentIds = $derived.by(() => {
        // Options par groupe.
        const optionIdsByGroup = new Map<string, Set<string>>();
        for (const o of store.options.items) {
            let set = optionIdsByGroup.get(o.groupId);
            if (!set) optionIdsByGroup.set(o.groupId, (set = new Set()));
            set.add(o.id);
        }
        // Groupes « choix » (avec au moins une option) applicables par niveau.
        const choixByLevel = new Map<string, Set<string>[]>();
        for (const g of store.optionGroups.items) {
            if (g.kind !== "choix") continue;
            const ids = optionIdsByGroup.get(g.id);
            if (!ids || ids.size === 0) continue; // groupe sans option : non contraignant
            for (const levelId of g.levelIds) {
                const arr = choixByLevel.get(levelId) ?? [];
                arr.push(ids);
                choixByLevel.set(levelId, arr);
            }
        }
        const invalid = new Set<string>();
        for (const s of store.students.items) {
            const groups = choixByLevel.get(s.levelId);
            if (!groups) continue;
            for (const ids of groups) {
                const count = s.optionIds.reduce(
                    (n, id) => n + (ids.has(id) ? 1 : 0),
                    0,
                );
                if (count !== 1) {
                    invalid.add(s.id);
                    break;
                }
            }
        }
        return invalid;
    });

    let search = $state("");
    let levelFilter = $state("");
    let sexFilter = $state("");
    let sortKey = $state<keyof Student>("lastName");
    let sortDir = $state<1 | -1>(1);
    let selectedId = $state<string | null>(null);

    const levelName = (id: string) => store.levels.get(id)?.name ?? "";

    const filtered = $derived.by(() => {
        const q = search.trim().toLowerCase();
        const rows = store.students.items.filter((s) => {
            if (levelFilter && s.levelId !== levelFilter) return false;
            if (sexFilter && s.sex !== sexFilter) return false;
            if (q && !studentLabel(s).toLowerCase().includes(q)) return false;
            return true;
        });
        const get = (s: Student) =>
            sortKey === "levelId"
                ? levelName(s.levelId)
                : String(s[sortKey] ?? "");
        return rows.sort(
            (a, b) => get(a).localeCompare(get(b), "fr") * sortDir,
        );
    });

    const plural = (n: number) => (n > 1 ? "élèves" : "élève");

    const selected = $derived(
        selectedId ? (store.students.get(selectedId) ?? null) : null,
    );

    function sortBy(key: keyof Student) {
        if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
        else {
            sortKey = key;
            sortDir = 1;
        }
    }

    function add() {
        const lvl = levelFilter || levels[0]?.id;
        if (!lvl) return;
        selectedId = addStudent(store, lvl).id;
    }

    const arrow = (key: keyof Student) =>
        sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : "";

    const SEX: Sex[] = ["F", "G"];
    const ACAD: Academic[] = ["A", "B", "C", "D"];
    const MOTEUR: Moteur[] = ["M", "M+"];
    const PERTURB: Perturbateur[] = ["Z", "Z+"];
</script>

<div class="flex h-full">
    <div class="flex min-w-0 flex-1 flex-col">
        <header class="mb-4">
            <h1 class="text-2xl font-bold">Élèves &amp; liens</h1>
            <p class="text-sm text-slate-500">
                {#if filtered.length < store.students.size}{filtered.length}/{store
                        .students.size}{:else}{store.students.size}{/if}
                {plural(store.students.size)}. Cliquez une ligne pour gérer ses
                options et ses liens.
            </p>
        </header>

        <div class="mb-3 flex flex-wrap items-center gap-2">
            <input
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Rechercher un nom…"
                bind:value={search}
            />
            <select
                class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                bind:value={levelFilter}
            >
                <option value="">Tous les niveaux</option>
                {#each levels as l (l.id)}<option value={l.id}>{l.name}</option
                    >{/each}
            </select>
            <select
                class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                bind:value={sexFilter}
            >
                <option value="">F + G</option>
                <option value="F">Filles</option>
                <option value="G">Garçons</option>
            </select>
            <button
                class="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                onclick={add}
            >
                + Élève
            </button>
        </div>

        {#if desktop.current}
            <div
                class="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white"
            >
                <table class="w-full border-collapse text-sm">
                    <thead class="sticky top-0 bg-slate-50">
                        <tr class="border-b border-slate-200 text-left">
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("lastName")}
                                >Nom{arrow("lastName")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("firstName")}
                                >Prénom{arrow("firstName")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("sex")}
                                >Sexe{arrow("sex")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("academic")}
                                >Niv.{arrow("academic")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("moteur")}
                                >Mot.{arrow("moteur")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("perturbateur")}
                                >Pert.{arrow("perturbateur")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("originClass")}
                                >Origine{arrow("originClass")}</th
                            >
                            <th
                                class="cursor-pointer px-2 py-2"
                                onclick={() => sortBy("levelId")}
                                >Niveau{arrow("levelId")}</th
                            >
                            <th class="px-2 py-2">Options</th>
                            <th class="px-2 py-2">Liens</th>
                            <th class="px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filtered as s (s.id)}
                            {@const lc = linkCounts.get(s.id)}
                            {@const withN = lc?.with ?? 0}
                            {@const apartN = lc?.apart ?? 0}
                            <tr
                                class="border-b border-slate-100 {invalidStudentIds.has(
                                    s.id,
                                )
                                    ? 'bg-red-50 outline-1 -outline-offset-1 outline-red-400 hover:bg-red-100'
                                    : selectedId === s.id
                                      ? 'bg-indigo-50'
                                      : 'hover:bg-indigo-50/40'}"
                                onclick={() => (selectedId = s.id)}
                            >
                                <td class="px-1 py-1">
                                    <input
                                        class="w-full rounded px-1 py-0.5 hover:bg-white focus:bg-white focus:outline focus:outline-indigo-300"
                                        value={s.lastName}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                lastName: e.currentTarget.value,
                                            })}
                                    />
                                </td>
                                <td class="px-1 py-1">
                                    <input
                                        class="w-full rounded px-1 py-0.5 hover:bg-white focus:bg-white focus:outline focus:outline-indigo-300"
                                        value={s.firstName}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                firstName:
                                                    e.currentTarget.value,
                                            })}
                                    />
                                </td>
                                <td class="px-1 py-1">
                                    <select
                                        class="rounded bg-transparent px-1 py-0.5"
                                        value={s.sex}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                sex: e.currentTarget
                                                    .value as Sex,
                                            })}
                                    >
                                        <option value=""></option>
                                        {#each SEX as v (v)}<option value={v}
                                                >{v}</option
                                            >{/each}
                                    </select>
                                </td>
                                <td class="px-1 py-1">
                                    <select
                                        class="rounded bg-transparent px-1 py-0.5"
                                        value={s.academic}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                academic: e.currentTarget
                                                    .value as Academic,
                                            })}
                                    >
                                        <option value=""></option>
                                        {#each ACAD as v (v)}<option value={v}
                                                >{v}</option
                                            >{/each}
                                    </select>
                                </td>
                                <td class="px-1 py-1">
                                    <select
                                        class="rounded bg-transparent px-1 py-0.5"
                                        value={s.moteur}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                moteur: e.currentTarget
                                                    .value as Moteur,
                                            })}
                                    >
                                        <option value=""></option>
                                        {#each MOTEUR as v (v)}<option value={v}
                                                >{v}</option
                                            >{/each}
                                    </select>
                                </td>
                                <td class="px-1 py-1">
                                    <select
                                        class="rounded bg-transparent px-1 py-0.5"
                                        value={s.perturbateur}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                perturbateur: e.currentTarget
                                                    .value as Perturbateur,
                                            })}
                                    >
                                        <option value=""></option>
                                        {#each PERTURB as v (v)}<option
                                                value={v}>{v}</option
                                            >{/each}
                                    </select>
                                </td>
                                <td class="px-1 py-1">
                                    <input
                                        class="w-20 rounded px-1 py-0.5 hover:bg-white focus:bg-white focus:outline focus:outline-indigo-300"
                                        value={s.originClass}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) =>
                                            store.students.update(s.id, {
                                                originClass:
                                                    e.currentTarget.value,
                                            })}
                                    />
                                </td>
                                <td class="px-2 py-1 text-slate-500"
                                    >{levelName(s.levelId)}</td
                                >
                                <td
                                    class="px-2 py-1 text-xs text-slate-500"
                                    title={optionNames(store, s).join(", ")}
                                >
                                    {#if s.optionIds.length}{optionNames(
                                            store,
                                            s,
                                        ).join(", ")}{:else}—{/if}
                                </td>
                                <td class="px-2 py-1 text-xs whitespace-nowrap">
                                    {#if withN}<span
                                            class="text-emerald-600"
                                            title="être avec">🔗{withN}</span
                                        >{/if}
                                    {#if apartN}<span
                                            class="ml-1 text-rose-600"
                                            title="séparer de">⛔{apartN}</span
                                        >{/if}
                                    {#if !withN && !apartN}<span
                                            class="text-slate-300">—</span
                                        >{/if}
                                </td>
                                <td class="px-1 py-1">
                                    <button
                                        class="rounded px-1 text-slate-300 hover:text-red-600"
                                        title="Supprimer"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            if (
                                                confirm(
                                                    `Supprimer ${studentLabel(s)} ?`,
                                                )
                                            )
                                                removeStudent(store, s.id);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        {/each}
                        {#if filtered.length === 0}
                            <tr
                                ><td
                                    class="px-4 py-6 text-center text-slate-400"
                                    colspan="11"
                                    >Aucun élève. Importez le tableau .ods ou
                                    ajoutez-en.</td
                                ></tr
                            >
                        {/if}
                    </tbody>
                </table>
            </div>
        {:else}
            <!-- Vue mobile : cartes empilées (montée seule sous md, voir MediaQuery). -->
            <div class="min-h-0 flex-1 space-y-2 overflow-auto">
                {#each filtered as s (s.id)}
                    {@const lc = linkCounts.get(s.id)}
                    {@const withN = lc?.with ?? 0}
                    {@const apartN = lc?.apart ?? 0}
                    {@const opts = optionNames(store, s)}
                    <button
                        type="button"
                        class="block w-full rounded-xl border p-3 text-left {invalidStudentIds.has(
                            s.id,
                        )
                            ? 'border-red-400 bg-red-50'
                            : selectedId === s.id
                              ? 'border-indigo-400 bg-white ring-1 ring-indigo-200'
                              : 'border-slate-200 bg-white'}"
                        onclick={() => (selectedId = s.id)}
                    >
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="truncate font-semibold">
                                    {studentLabel(s) || "Sans nom"}
                                </p>
                                <p class="text-xs text-slate-500">
                                    {levelName(s.levelId)}
                                </p>
                            </div>
                            <span
                                role="button"
                                tabindex="0"
                                class="-mt-1 -mr-1 rounded px-2 py-1 text-slate-300 hover:text-red-600"
                                title="Supprimer"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    if (
                                        confirm(
                                            `Supprimer ${studentLabel(s)} ?`,
                                        )
                                    )
                                        removeStudent(store, s.id);
                                }}
                                onkeydown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.stopPropagation();
                                        if (
                                            confirm(
                                                `Supprimer ${studentLabel(s)} ?`,
                                            )
                                        )
                                            removeStudent(store, s.id);
                                    }
                                }}
                            >
                                ✕
                            </span>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
                            {#if s.sex}<span
                                    class="rounded bg-slate-100 px-1.5 py-0.5"
                                    >{s.sex}</span
                                >{/if}
                            {#if s.academic}<span
                                    class="rounded bg-slate-100 px-1.5 py-0.5"
                                    >Niv. {s.academic}</span
                                >{/if}
                            {#if s.moteur}<span
                                    class="rounded bg-slate-100 px-1.5 py-0.5"
                                    >{s.moteur}</span
                                >{/if}
                            {#if s.perturbateur}<span
                                    class="rounded bg-slate-100 px-1.5 py-0.5"
                                    >{s.perturbateur}</span
                                >{/if}
                            {#if s.originClass}<span
                                    class="rounded bg-slate-100 px-1.5 py-0.5"
                                    >{s.originClass}</span
                                >{/if}
                            {#if withN}<span
                                    class="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600"
                                    >🔗{withN}</span
                                >{/if}
                            {#if apartN}<span
                                    class="rounded bg-rose-50 px-1.5 py-0.5 text-rose-600"
                                    >⛔{apartN}</span
                                >{/if}
                        </div>
                        {#if opts.length}
                            <p class="mt-1.5 text-xs text-slate-500">
                                {opts.join(", ")}
                            </p>
                        {/if}
                    </button>
                {/each}
                {#if filtered.length === 0}
                    <p class="px-4 py-6 text-center text-slate-400">
                        Aucun élève. Importez le tableau .ods ou ajoutez-en.
                    </p>
                {/if}
            </div>
        {/if}
    </div>

    {#if selected}
        <StudentPanel
            {store}
            student={selected}
            onclose={() => (selectedId = null)}
        />
    {/if}
</div>
