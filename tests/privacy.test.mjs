import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const privacy = await readFile(new URL('ochrana-osobnich-udaju/index.html', root), 'utf8');
const home = await readFile(new URL('index.html', root), 'utf8');
const text = value => value.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

test('Ochrana osobních údajů obsahuje přesné schválené bloky včetně data', async () => {
  const expected = JSON.parse(await readFile(new URL('tests/fixtures/privacy-copy.json', root), 'utf8'));
  const main = privacy.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const actual = [...main.matchAll(/<(h1|h2|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(([, tag, content]) => ({ tag, text: text(content) }));
  assert.deepEqual(actual, expected);
  assert.equal(actual.filter(block => block.tag === 'h1').length, 1);
  assert.equal(actual.filter(block => block.tag === 'h2').length, 6);
  assert.match(privacy, /<html lang="cs">/);
});

test('Obě stránky mají veřejný mailto kontakt a žádné TODO ani technickou schránku', () => {
  for (const page of [home, privacy]) {
    assert.doesNotMatch(page, /TODO|REPLACE_WITH|imperium@isb7\.cz|<TEST>/);
    for (const [, email] of page.matchAll(/href="mailto:([^"]+)"/g)) assert.equal(email, 'lucie@strihnuto.cz');
    assert.match(page, /href="mailto:lucie@strihnuto.cz"/);
    assert.match(page, /IČO: 30204101/);
    assert.match(page, /Blahoslavova 430, Moravské Budějovice/);
    assert.match(page, /made by ISB7/);
  }
});

test('Formulář má přesný informační text a upozornění, bez GDPR checkboxu', () => {
  const note = home.match(/<p class="form-privacy-note">([\s\S]*?)<\/p>/)[1];
  assert.equal(text(note), 'Odesláním formuláře nám předáváte údaje potřebné k vyřízení vaší poptávky. Více informací najdete v Ochraně osobních údajů.');
  assert.match(note, /<a href="\/ochrana-osobnich-udaju">Ochraně osobních údajů<\/a>/);
  assert.match(home, /id="message-privacy-note"[^>]*>Prosíme, neuvádějte diagnózy ani jiné citlivé zdravotní údaje\.<\/p>/);
  assert.doesNotMatch(home, /type="checkbox"/);
  assert.match(home, /aria-describedby="message-privacy-note"/);
  const footer = home.match(/<footer>[\s\S]*?<\/footer>/)[0];
  assert.match(footer, /href="\/ochrana-osobnich-udaju">Ochrana osobních údajů/);
});

test('Nová stránka má funkční lokální zdroje, návrat domů a nenačítá Turnstile', async () => {
  assert.match(privacy, /href="\/">Zpět na hlavní stránku/);
  assert.doesNotMatch(privacy, /<script|<iframe/);
  for (const [, value] of privacy.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (value.startsWith('mailto:')) { assert.equal(value, 'mailto:lucie@strihnuto.cz'); continue; }
    if (value.startsWith('#')) { assert.ok(privacy.includes(`id="${value.slice(1)}"`)); continue; }
    const [path, fragment] = value.split('#');
    const target = path === '/' ? 'index.html' : path === '/ochrana-osobnich-udaju' ? 'ochrana-osobnich-udaju/index.html' : path.slice(1);
    await access(new URL(target, root));
    if (fragment) assert.ok((await readFile(new URL(target, root), 'utf8')).includes(`id="${fragment}"`));
  }
});
