import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$routes: path.resolve('src/routes'),
			$components: path.resolve('src/library/components'),
			$styles: path.resolve('src/library/styles'),
			$utils: path.resolve('src/library/utils')
		}
	}
});
