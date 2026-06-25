import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// HTTPS de dev : activé automatiquement si le certificat auto-signé existe
// (généré par `npm run cert`). Requis pour tester la collaboration P2P sur le
// réseau local — `crypto.subtle` n'est dispo qu'en contexte sécurisé.
const keyPath = fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url));
const certPath = fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url));
const https =
	existsSync(keyPath) && existsSync(certPath)
		? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
		: undefined;

export default defineConfig({
	server: { host: true, https },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// SPA locale : tout s'exécute côté client, aucune donnée ne transite vers un serveur.
			// `fallback` sert la même page pour toutes les routes (rendu client-side).
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
