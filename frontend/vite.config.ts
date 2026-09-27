import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(value?: string): string {
  if (!value || value === '/') return '/';

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function githubPagesBase(repository?: string): string | undefined {
  if (!repository) return undefined;

  const repositoryName = repository.split('/').pop();
  if (!repositoryName || repositoryName.endsWith('.github.io')) return '/';
  return `/${repositoryName}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBasePath(
    env.VITE_BASE_PATH || githubPagesBase(env.GITHUB_REPOSITORY)
  );

  return {
    base,
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
    },
  } as any;
});
