import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const REACT_APP_KEYS = [
  'REACT_APP_API_BASE_URL',
  'REACT_APP_API_URL',
  'REACT_APP_APP_VERSION',
  'REACT_APP_BOOTSTRAP_URL',
  'REACT_APP_FINANCE_MODULE_ENABLED',
  'REACT_APP_MOBILE_UI_V2',
  'REACT_APP_ONLINE_ONLY',
  'REACT_APP_SHOW_LEGACY_SYNC_UI',
  'REACT_APP_SUPABASE_ANON_KEY',
  'REACT_APP_SUPABASE_PUBLISHABLE_KEY',
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_REQUIRE_LOGIN',
  'REACT_APP_SYNC_URL',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const defineEnv = Object.fromEntries(
    REACT_APP_KEYS.map(key => ['process.env.' + key, JSON.stringify(env[key] ?? '')])
  );

  defineEnv['process.env.NODE_ENV'] = JSON.stringify(mode);

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'REACT_APP_'],
    define: defineEnv,
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: true,
      testTimeout: 15000,
      hookTimeout: 15000,
    },
  };
});
