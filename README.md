# Constitution des classes

Application web locale (local-first) pour aider les enseignants à **constituer les classes**
d'un établissement : structure, options, échange avec le secrétariat via un tableur `.ods`,
placement des élèves par glisser-déposer avec statistiques et contrôles en direct, puis export
des résultats. La collaboration entre plusieurs postes se fait en **pair-à-pair chiffré**, sans
qu'aucune donnée élève ne transite par un serveur.

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173
```

Pour la collaboration temps réel, lancer aussi le serveur de signalisation (voir plus bas) :

```bash
npm run signaling    # ws://localhost:4444
```

Build de production (SPA statique, dossier `build/`) :

```bash
npm run build && npm run preview
```

## Flux d'utilisation

1. **Structure** — niveaux et classes (noms libres, capacité par défaut 30).
2. **Options** — groupes d'options (*choix obligatoire* type LV2 vs *option facultative*) et
   matrice « quelle classe propose quelle option ».
3. **Secrétariat** — export du modèle `.ods` (une feuille par niveau) puis import du fichier
   complété.
4. **Élèves** — liste éditable/filtrable/triable, et liens entre élèves (« être avec » /
   « séparer de »).
5. **Constitution** — glisser-déposer des élèves dans les classes ; statistiques en direct
   (F/G, niveaux A–D, moteurs/perturbateurs), surlignage des liens (🔗) et mise en évidence
   **rouge** des situations invalides (option non proposée, lien non respecté) avec explication
   au survol. Bouton d'**export des résultats** `.ods` (colonne « Future classe » remplie).

## Architecture

- **SvelteKit + Svelte 5 (runes) + TypeScript**, en SPA statique (`adapter-static`, `ssr=false`).
- **Yjs** (CRDT) est l'unique source de vérité, persistée localement via **IndexedDB**
  (`y-indexeddb`). Les collections réactives enveloppent les types Yjs (`src/lib/store/`).
- **Tailwind CSS**, glisser-déposer **svelte-dnd-action**, lecture/écriture `.ods` via **SheetJS**.
- **Collaboration P2P** : **y-webrtc**, salon = id de projet, chiffré par la clé de partage.
  Stratégie **P2P direct strict** (STUN seul, pas de relais TURN). Le serveur de signalisation
  (`signaling/`) ne relaie que des métadonnées de connexion. Voir `signaling/README.md`.

### Organisation du code

```
src/lib/store/       document Yjs, collections réactives, registre des projets
src/lib/domain/      logique métier (structure, options, élèves, validation, stats)
src/lib/services/    import/export .ods (schéma partagé)
src/lib/sync/        transport de synchronisation P2P (modulaire)
src/lib/components/   composants UI
src/routes/          pages (structure, options, secretariat, eleves, constitution)
signaling/           serveur de signalisation auto-hébergé
```

## Confidentialité

Toutes les données élèves restent sur les postes (IndexedDB). En collaboration, elles
circulent **directement entre pairs**, chiffrées par la clé de partage du projet ; seuls les
messages de mise en relation WebRTC passent par le serveur de signalisation.
