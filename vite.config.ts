import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
