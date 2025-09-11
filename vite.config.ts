import path from 'path';
import { defineConfig } from 'vite';

import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@assets': path.resolve(__dirname, './src/assets'),
            '@components': path.resolve(__dirname, './src/components'),
            '@images': path.resolve(__dirname, './public/images'),
        },
    },
    server: {
        open: true,
    },
    plugins: [glsl()]
});