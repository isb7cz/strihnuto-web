import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { renderClientStories } from './client-stories.mjs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('data/client-stories.json', root), 'utf8'));
const stories = renderClientStories(data);
const html = (await readFile(new URL('index.html', root), 'utf8'))
  .replace('<!-- client-stories-section -->', stories.section)
  .replace('<!-- client-stories-navigation -->', stories.navigation);
await rm(new URL('dist', root), { recursive: true, force: true });
await mkdir(new URL('dist', root));
await writeFile(new URL('dist/index.html', root), html);
for (const file of ['styles.css', 'assets', 'contact.js']) {
  await cp(new URL(file, root), new URL(`dist/${file}`, root), { recursive: true });
}
console.log('Statický web sestaven do dist/.');
