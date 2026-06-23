# Serveur de signalisation (collaboration P2P)

Ce petit serveur met en relation les navigateurs pour établir les connexions WebRTC
pair-à-pair. **Aucune donnée élève n'y transite** : il ne relaie que les métadonnées
de connexion (offres/réponses SDP, candidats ICE), regroupées par salon. Une fois la
liaison P2P établie, toutes les données circulent directement entre postes, chiffrées
par le mot de passe de salon (la clé de partage du projet).

## Lancer le serveur

```bash
npm run signaling          # écoute sur ws://localhost:4444
PORT=5000 npm run signaling # autre port
```

Pour une collaboration entre établissements/réseaux différents, héberger ce serveur sur
une machine joignable par tous les postes (ex. un petit VPS) et renseigner son URL
(`wss://…`) dans le widget « Collaboration » de l'application.

## Stratégie réseau

- **P2P direct strict** (par défaut) : seuls des serveurs STUN publics sont utilisés
  pour la découverte d'adresses ; aucune donnée (même chiffrée) ne transite par un
  relais. Si les pare-feux empêchent la liaison directe, la connexion entre ces deux
  postes ne s'établit pas.
- **Repli** (non activé) : ajouter un relais TURN auto-hébergé (coturn) dans la config
  ICE du provider. Le chiffrement de salon garantit que le relais ne voit que du
  chiffré. Voir `src/lib/sync/webrtc.svelte.ts`.
