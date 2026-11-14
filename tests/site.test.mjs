import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
test('Česká stránka má jeden hlavní nadpis, sekce a metadata', () => {
 assert.match(html, /<html lang="cs">/);
 assert.equal((html.match(/<h1\b/g) || []).length, 1);
 for (const id of ['uvod','poslani','pro-koho','sluzby','lucie','oblast','kontakt']) assert.ok(html.includes(`id="${id}"`));
 assert.match(html, /name="description"/); assert.match(html, /30204101/);
});
test('Navigace vede na existující unikátní cíle', () => {
 const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
 assert.equal(ids.length, new Set(ids).size);
 for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
test('Zdroje jsou lokální a existují, kontakty nejsou vymyšlené', async () => {
 for (const [,path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (path.startsWith('#')) continue;
  assert.ok(!path.includes('://'), path); await access(new URL(path, root));
 }
 assert.doesNotMatch(html, /<script|<iframe|<form|mailto:|tel:/i);
 assert.match(html, /TODO: doplnit kontaktní e-mail/);
});
