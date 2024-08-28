import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/** @type {import('vite').UserConfig} */
export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
    	include: ["html-minifier-terser", "clean-css"]
 	},
 	define: {
		'process.env': {},
		'process.platform': JSON.stringify(process.platform)
	}
	test: {
		include: ['./src/**/*.{test,spec}.{js,ts}']
	}
});
