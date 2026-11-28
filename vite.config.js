import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api-gateway/geocode': {
                    target: 'https://dronenav.org',
                    changeOrigin: true,
                    secure: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq) => {
                            if (env.DRUPAL_SESSION_COOKIE) {
                                proxyReq.setHeader(
                                    'Cookie',
                                    env.DRUPAL_SESSION_COOKIE
                                );
                            }
                        });
                    },
                },
            },
        },
    };
})
