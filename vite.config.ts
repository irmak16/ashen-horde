import { defineConfig } from 'vite';

// './' => site works under any sub-path (e.g. username.github.io/repo-name/)
export default defineConfig({ base: './' });
