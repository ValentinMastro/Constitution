#!/usr/bin/env bash
#
# Déploiement du site « Constitution » sur le VPS.
# À lancer depuis la racine du projet, sur le serveur :
#
#     ./deploy.sh
#
# Le code source est dans /srv/apps/Constitution. Le script : met à jour le
# code (git), installe les dépendances, construit la SPA statique
# (adapter-static, fallback index.html), puis synchronise le résultat vers le
# dossier servi par nginx. Aucun service à redémarrer (c'est du statique) ; un
# reload nginx optionnel est proposé en fin de script.

set -euo pipefail

# --- Réglages (surchargeable par variables d'environnement) -----------------
# Dossier servi par nginx (cf. `root` dans le bloc serveur).
TARGET_DIR="${TARGET_DIR:-/var/www/constitution}"
# Propriétaire des fichiers déployés (utilisateur nginx).
WWW_USER="${WWW_USER:-http}"
# Mettre à 0 pour sauter le `git pull` (utile si on déploie un état local).
GIT_PULL="${GIT_PULL:-1}"

# Se placer à la racine du projet (dossier du script), quel que soit l'appelant.
cd "$(dirname "$0")"

# sudo seulement si on n'est pas déjà root.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
fi

echo "==> Déploiement vers ${TARGET_DIR}"

# --- 1. Récupérer la dernière version du code -------------------------------
if [ "${GIT_PULL}" = "1" ] && [ -d .git ]; then
    echo "==> git pull"
    git pull --ff-only
fi

# --- 2. Dépendances ---------------------------------------------------------
# `npm ci` = installation propre et reproductible à partir du package-lock.
echo "==> Installation des dépendances (npm ci)"
if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi

# --- 3. Construction de la SPA statique ------------------------------------
echo "==> Build (npm run build)"
npm run build

if [ ! -f build/index.html ]; then
    echo "!! Le build a échoué : build/index.html introuvable." >&2
    exit 1
fi

# --- 4. Synchronisation vers le dossier nginx -------------------------------
echo "==> Synchronisation vers ${TARGET_DIR}"
$SUDO mkdir -p "${TARGET_DIR}"
# --delete : retire les anciens assets hashés qui n'existent plus.
$SUDO rsync -a --delete build/ "${TARGET_DIR}/"
$SUDO chown -R "${WWW_USER}:${WWW_USER}" "${TARGET_DIR}"

# --- 5. Reload nginx (optionnel) -------------------------------------------
if command -v nginx >/dev/null 2>&1; then
    echo "==> Vérification de la configuration nginx"
    if $SUDO nginx -t >/dev/null 2>&1; then
        $SUDO systemctl reload nginx && echo "==> nginx rechargé"
    else
        echo "!! nginx -t a échoué : configuration non rechargée (le site reste servi)." >&2
    fi
fi

echo "==> Terminé. Site disponible sur https://constitution.mathro.fr"
