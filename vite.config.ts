import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {

        target: 'chrome69'

    },
    server: {
        proxy: {
            '/api': {
                target: 'https://127.0.0.1:8091',
                secure: false,
            },
            '/storage': {
                target: 'https://127.0.0.1:8091',
                secure: false,
            },
            '/ws': {
                target: 'https://127.0.0.1:8091',
                secure: false,
                ws: true,
            },
        },
    },
})
