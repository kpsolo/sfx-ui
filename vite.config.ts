import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Deployment settings: deploy/.env and deploy/.env.<mode> (e.g. deploy/.env.pages for
 * `--mode pages`), overridden by non-empty environment variables. Empty variables don't
 * override, because CI passes unset repository variables as empty strings.
 */
function deployEnv(mode: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of ['.env', `.env.${mode}`, `.env.${mode}.local`]) {
    const path = resolve(fileURLToPath(new URL('.', import.meta.url)), 'deploy', file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  for (const key of Object.keys(out)) {
    const fromEnv = process.env[key]?.trim();
    if (fromEnv) out[key] = fromEnv;
  }
  return out;
}

/**
 * Injects a Chrome origin-trial token for HTML-in-Canvas when ORIGIN_TRIAL_TOKEN is set, so
 * visitors on Chrome versions covered by the trial don't need chrome://flags. Tokens are bound
 * to one origin (e.g. https://<user>.github.io) and are public by design.
 */
function originTrial(token: string | undefined): Plugin {
  return {
    name: 'sfx-origin-trial',
    transformIndexHtml(html) {
      if (!token) return html;
      return html.replace('<head>', `<head>\n    <meta http-equiv="origin-trial" content="${token}" />`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = deployEnv(mode);

  // GitHub Pages serves a project site under /<repo>/. Only the repo name is configured:
  // a value like "/sfx-ui/" gets rewritten to a Windows path by Git Bash when building locally.
  const pagesRepo = env.PAGES_REPO?.trim();

  return {
    base: pagesRepo ? `/${pagesRepo}/` : '/',
    plugins: [react(), originTrial(env.ORIGIN_TRIAL_TOKEN?.trim())],
    server: {
      port: 5173,
      host: true,
    },
  };
});
