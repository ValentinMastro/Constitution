# Configuration de la collaboration (VPS / nginx)

Ce document décrit ce qu'il faut mettre en place **en production** (VPS + nginx) pour que la
synchronisation temps réel entre appareils fonctionne sur `https://constitution.mathro.fr`.

> En **développement**, rien de tout cela n'est nécessaire : le serveur de signalisation est monté
> automatiquement sur le serveur Vite (plugin `signalingPlugin` dans `vite.config.ts`), au chemin
> `/signaling`. C'est uniquement la mise en production qui demande la configuration ci-dessous.

---

## 1. Rappel de l'architecture

L'application est une **SPA statique** (adapter-static) : il n'y a pas de backend applicatif. La
collaboration repose sur trois briques :

| Brique | Rôle | Données qui y transitent |
|---|---|---|
| **App (statique)** | L'interface, servie par nginx depuis `/var/www/constitution`. | — |
| **Serveur de signalisation** (`signaling/server.js`) | Met en relation les pairs WebRTC (échange des offres/réponses SDP et des candidats ICE), regroupés par salon. | **Uniquement** des métadonnées de mise en relation. **Aucune** donnée élève. |
| **Connexion P2P** (WebRTC, navigateur ↔ navigateur) | Transporte le document Yjs, **chiffré** par la clé de partage du projet. | Toutes les données du projet, chiffrées de bout en bout. |

Point clé de sécurité : **les données élèves ne passent jamais par le serveur**. Le serveur de
signalisation ne voit que des métadonnées de connexion ; le contenu circule directement entre les
navigateurs, chiffré par le mot de passe de salon (la `shareKey` du projet).

### Postes « invités » éphémères et révocation à distance

Un appareil qui **rejoint** un projet (en scannant le QR Code ou via un code de partage, route
`?join=…` / `joinShared`) est marqué **invité éphémère** (`ephemeral: true` dans sa `ProjectMeta`
locale). Cette distinction de rôle est **purement locale** : elle n'est pas encodée dans le code de
partage et ne transite donc pas sur le réseau. Le PC qui a **créé** le projet, lui, n'est jamais
éphémère et garde toujours ses données.

Deux comportements de sécurité en découlent (logique applicative, **aucune** config VPS) :

- **Déconnexion/fermeture côté invité** : sur un poste invité, « Déconnecter » ou « Fermer le
  projet » coupe le P2P **et efface toutes les données locales** (base IndexedDB + métadonnées).
  Rien ne subsiste sur le téléphone.
- **Révocation à distance depuis le PC source** : quand on clique « Déconnecter » sur le PC, celui-ci
  diffuse une commande `control.revoke` via le canal **awareness** de y-webrtc (le même transport
  P2P chiffré, aucune donnée élève), puis se déconnecte. Les invités connectés la reçoivent,
  ferment le projet et **purgent leurs données locales** automatiquement. Le PC, lui, conserve les
  siennes.

> ⚠️ Limite : la commande de révocation passe par le canal **temps réel** (awareness, non persisté).
> Elle ne purge que les invités **connectés au moment du clic**. Un téléphone hors-ligne à cet
> instant ne reçoit pas l'ordre ; ses données restent jusqu'à ce qu'il se reconnecte (et soit
> révoqué) ou qu'on les efface manuellement depuis l'appareil. Aucune incidence sur la config VPS.

### Pourquoi `/signaling` sur la même origine

Le client se connecte par défaut à `wss://<origine-de-l'app>/signaling` (cf. `defaultSignaling()`
dans `src/lib/sync/webrtc.svelte.ts`). On réutilise ainsi l'hôte, le port **et le certificat TLS**
de l'app. C'est indispensable sur mobile : un téléphone qui a accepté le certificat pour ouvrir le
site peut se synchroniser **sans** devoir accepter un second certificat sur un autre port (chose
quasi impossible à faire sur un port purement WebSocket).

En production, le certificat est un vrai certificat (Let's Encrypt) : aucune acceptation manuelle.
Il suffit que nginx **proxifie** `wss://constitution.mathro.fr/signaling` vers le serveur de
signalisation local.

```
Navigateur PC ─┐                          ┌─ wss://constitution.mathro.fr/signaling
               ├─ (mise en relation) ─────┤        (nginx → 127.0.0.1:4444)
Navigateur Tél ┘                          └─ serveur de signalisation (node)

Navigateur PC ══════ P2P WebRTC chiffré (données Yjs) ══════ Navigateur Tél
```

---

## 2. Serveur de signalisation (service systemd)

Le serveur de signalisation est un petit process Node (`signaling/server.js`) à faire tourner en
permanence. En production, il écoute en **clair** (`ws://`) sur un port local (4444 par défaut) :
c'est nginx qui termine le TLS et le proxifie. Inutile de lui fournir un certificat — il n'en
utilise un que si les certs de dev `certs/*.pem` existent (ce qui n'est pas le cas sur le VPS).

### 2.1 Restreindre l'écoute à localhost (recommandé)

Par défaut, `signaling/server.js` écoute sur **toutes** les interfaces (`0.0.0.0:4444`). Comme seul
nginx (en local) doit le joindre, deux options pour éviter de l'exposer directement sur Internet :

- **Pare-feu** : bloquer le port 4444 en entrée (ex. `ufw deny 4444`), OU
- l'exposer uniquement en local. Le service systemd ci-dessous suffit si le port 4444 est fermé au
  public par le pare-feu du VPS.

### 2.2 Unité systemd

Créer `/etc/systemd/system/constitution-signaling.service` :

```ini
[Unit]
Description=Serveur de signalisation y-webrtc (Constitution)
After=network.target

[Service]
Type=simple
# Compte non privilégié ; adapter au besoin.
User=http
Group=http
WorkingDirectory=/srv/apps/Constitution
Environment=PORT=4444
# Décommenter pour des logs détaillés de signalisation :
# Environment=DEBUG=1
ExecStart=/usr/bin/node signaling/server.js
Restart=always
RestartSec=2

# Durcissement (optionnel mais conseillé)
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

> Adapter le chemin de `node` (`which node`) et `WorkingDirectory` au VPS. Le service n'a besoin
> d'aucun accès en écriture (il ne fait que relayer en mémoire).

Activer et démarrer :

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now constitution-signaling.service
sudo systemctl status constitution-signaling.service   # doit être "active (running)"
```

Vérifier qu'il écoute :

```bash
ss -tlnp | grep 4444
# logs :
journalctl -u constitution-signaling -f
```

---

## 3. nginx : proxifier `/signaling`

Dans le **bloc serveur HTTPS** de `constitution.mathro.fr` (celui qui contient `root
/var/www/constitution;`), ajouter une `location` pour `/signaling` qui gère la mise à niveau
WebSocket. La voici, accompagnée du `location /` habituel d'une SPA pour rappel :

```nginx
server {
    listen 443 ssl http2;
    server_name constitution.mathro.fr;

    # … certificats Let's Encrypt (ssl_certificate / ssl_certificate_key) …

    root /var/www/constitution;
    index index.html;

    # --- Signalisation WebRTC (WebSocket) -> serveur de signalisation local ---
    location /signaling {
        proxy_pass http://127.0.0.1:4444;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # La connexion est longue (pings toutes les 30 s) : éviter une coupure
        # par timeout. Doit rester > à l'intervalle de ping.
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # --- SPA : tout le reste est servi en statique, fallback index.html ---
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Points importants :

- `proxy_pass http://127.0.0.1:4444;` est en **`http://`** (clair) : nginx parle au serveur de
  signalisation en local sans TLS. Côté navigateur, c'est bien `wss://` (TLS terminé par nginx).
- Les en-têtes `Upgrade` / `Connection "upgrade"` sont **obligatoires** : sans eux, la WebSocket ne
  s'établit pas (le proxy retombe en HTTP classique).
- Le `proxy_read_timeout` long évite que nginx ferme la connexion inactive entre deux messages.

Appliquer :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> Si HTTP/2 pose souci avec l'upgrade WebSocket sur ta version de nginx, le proxy WebSocket utilise
> de toute façon HTTP/1.1 en interne (`proxy_http_version 1.1`), donc rien à changer.

---

## 4. Traversée de NAT : STUN et (au besoin) TURN

La connexion de données est **directe** entre navigateurs (P2P). Pour l'établir à travers les
box/routeurs, WebRTC utilise des serveurs **STUN** (déjà configurés : Google STUN, dans
`ICE_SERVERS` de `src/lib/sync/webrtc.svelte.ts`).

- **Même réseau local** (PC + téléphone sur le même Wi-Fi) : fonctionne avec STUN seul.
- **Réseaux différents** (ex. un collègue chez lui, toi au collège) : STUN suffit pour la majorité
  des NAT, **mais pas pour les NAT symétriques / pare-feux d'entreprise stricts**. Dans ces cas, la
  connexion P2P échoue silencieusement (signalisation OK, mais pas de flux de données).

Pour une fiabilité maximale entre réseaux quelconques, héberger un serveur **TURN** (relais
chiffré) — typiquement [coturn](https://github.com/coturn/coturn) — et l'ajouter à `ICE_SERVERS` :

```ts
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    {
        urls: 'turn:turn.mathro.fr:3478',
        username: 'constitution',
        credential: 'LE_SECRET_TURN'
    }
];
```

> ⚠️ Un secret TURN inclus dans une SPA est **public** (visible côté client). Pour un vrai
> déploiement, préférer des **identifiants TURN éphémères** (mécanisme REST/HMAC de coturn) servis à
> la demande. Tant qu'on reste en usage « même Wi-Fi » (cas nominal de la classe), STUN seul suffit
> et TURN est superflu.

---

## 5. Vérification après déploiement

1. **Le service tourne** : `systemctl status constitution-signaling` → `active (running)`.
2. **nginx route `/signaling`** : depuis ta machine,
   ```bash
   curl -i -N \
     -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
     https://constitution.mathro.fr/signaling
   ```
   Réponse attendue : `HTTP/1.1 101 Switching Protocols`.
3. **Synchro réelle** : ouvrir le projet sur deux appareils (PC + téléphone via QR Code), activer
   la collaboration des deux côtés. Le champ « Serveur de signalisation » doit afficher
   `wss://constitution.mathro.fr/signaling` (laisser **vide** = défaut). Les données doivent
   apparaître sur le second appareil en quelques secondes.
4. **Révocation à distance** : les deux appareils étant connectés, cliquer « Déconnecter » **sur le
   PC**. En ~1 s, le téléphone doit revenir à l'accueil, le projet doit avoir disparu de sa liste et
   sa base IndexedDB `cc-project-<id>` doit être supprimée (DevTools → Application). Côté PC, les
   données **restent** présentes.

### Dépannage

| Symptôme | Cause probable |
|---|---|
| Statut reste « Connexion… », jamais « Connecté » | nginx ne proxifie pas `/signaling` (en-têtes Upgrade manquants), ou le service de signalisation est arrêté. |
| « Connecté · 0 pair(s) » des deux côtés malgré la même clé | Les deux pairs ne joignent pas le **même** serveur de signalisation (vérifier que le champ pointe bien vers `/signaling` sur les deux, ou le vider). |
| Connecté, pairs détectés, mais **aucune donnée** | La connexion P2P WebRTC n'aboutit pas (NAT restrictif) → voir §4 (TURN). |
| Marche sur le même Wi-Fi mais pas entre réseaux distants | NAT symétrique → TURN requis (§4). |

---

## 6. Récapitulatif sécurité

- Le serveur de signalisation ne voit **jamais** les données du projet ; il ne relaie que des
  métadonnées de connexion. Les données circulent en **P2P chiffré** (clé de partage du projet).
- Garder le port 4444 **fermé** au public (accessible seulement via le proxy nginx local).
- La clé de partage d'un projet vaut accès complet à ses données : la transmettre par un canal de
  confiance (le QR Code reste local au réseau ; le lien `?join=` contient cette clé).
- Les appareils **invités** (téléphones ayant rejoint via QR/code) ne sont pas des copies
  permanentes : leurs données locales sont effacées dès la déconnexion (locale ou révoquée par le
  PC source). Pour un téléphone prêté/partagé, c'est la garantie qu'aucune donnée élève n'y reste
  après la séance — à condition qu'il soit connecté au moment de la révocation (cf. §1).
