import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8').trimStart();

if (!index.toLowerCase().startsWith('<!doctype html>')) {
  throw new Error('index.html must be the Vite HTML entry point, not README/Markdown content.');
}

if (!index.includes('src="/src/main.ts"')) {
  throw new Error('index.html must load the app via <script type="module" src="/src/main.ts">.');
}

console.log('Entry HTML verified');
