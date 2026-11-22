import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { renderClientStories } from '../scripts/client-stories.mjs';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const copy = JSON.parse(await readFile(new URL('tests/fixtures/approved-copy.json', root), 'utf8'));
const text = value => value.replace(/\u00a0/g, ' ').replace(/<[^>]*>/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim();

test('Všechny schválené texty jsou doslovné, úplné a ve správném pořadí', () => {
  const ids = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, Object.keys(copy));
  for (const [id, { heading, paragraphs }] of Object.entries(copy)) {
    const section = html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</section>`))[1];
    const content = text(section);
    assert.ok(content.includes(heading), `${id}: nadpis`);
    let lastIndex = content.indexOf(heading);
    for (const paragraph of paragraphs) {
      const index = content.indexOf(paragraph);
      assert.ok(index > lastIndex, `${id}: ${paragraph}`);
      assert.equal(content.split(paragraph).length - 1, 1, 'Text se neopakuje');
      lastIndex = index;
    }
  }
});

test('Česká stránka má jeden h1, metadata a neobsahuje staré slogany', () => {
  assert.match(html, /<html lang="cs">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /name="description"/);
  assert.match(html, /30204101/);
  assert.match(html, /made by ISB7/);
  assert.doesNotMatch(html, /Každý si zaslouží|Malá změna vzhledu|Velký rozdíl|20 let|S lidskostí|Dobrý střih|Dobře se cítit patří|Váš styl|Začněme|Péče, která má smysl/i);
});

test('Navigace vede na existující unikátní cíle', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
});

test('Zdroje existují, povolený externí skript je pouze Turnstile, kontakty nejsou vymyšlené', async () => {
  for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (path.startsWith('#') || path === 'mailto:lucie@strihnuto.cz') continue;
    if (path === 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onContactTurnstileLoad&amp;render=explicit') continue;
    assert.ok(!path.includes('://'), path);
    await access(new URL(path.replace(/^\//, ''), root));
  }
  assert.doesNotMatch(html, /<iframe|tel:/i);
  assert.deepEqual([...html.matchAll(/href="(mailto:[^"]+)"/g)].map(m => m[1]), ['mailto:lucie@strihnuto.cz', 'mailto:lucie@strihnuto.cz']);
  const sources = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(sources, ['contact.js?v=20261117-2', 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onContactTurnstileLoad&amp;render=explicit']);
  assert.doesNotMatch(html, /TODO|imperium@isb7\.cz/);
});

test('Formulář má popsaná povinná pole, nepovinný e-mail a nepředstírá odeslání', () => {
  const form = html.match(/<form\b[\s\S]*?<\/form>/)[0];
  // method=dialog prevents network submission even without JS or with implicit Enter.
  assert.match(form, /method="dialog"/);
  assert.match(form, /<button[^>]*type="submit"[^>]*disabled/);
  for (const id of ['name', 'phone', 'town', 'request-type', 'message']) {
    assert.match(form, new RegExp(`<label for="${id}">`));
    assert.match(form, new RegExp(`<(?:input|select|textarea)[^>]*id="${id}"[^>]*required`));
  }
  const email = form.match(/<input[^>]*id="email"[^>]*>/)[0];
  assert.match(email, /type="email"/);
  assert.doesNotMatch(email, /required/);
  assert.match(form, /id="contact-turnstile"/);
  assert.match(form, /role="status"/);
});

test('Reference lze vypnout; chybějící data a souhlas blokují zveřejnění', async () => {
  const data = JSON.parse(await readFile(new URL('data/client-stories.json', root), 'utf8'));
  assert.equal(data.enabled, true, 'První schválené reference jsou zveřejněné');
  assert.deepEqual(renderClientStories({ ...data, enabled: false }), { section: '', navigation: '' });
  assert.throws(() => renderClientStories({ ...data, enabled: true, stories: [] }), /bez skutečného příběhu/);
  assert.throws(() => renderClientStories({ ...data, enabled: true, stories: [{}] }), /souhlasu/);
  assert.throws(() => renderClientStories({ ...data, enabled: true, stories: [{ consentConfirmed: true }] }), /clientLabel/);
  // Technical sentinel strings only; no invented client or review.
  const sentinel = Object.fromEntries(['clientLabel', 'approximateAge', 'area', 'situation', 'service', 'review'].map(key => [key, '<TEST>']));
  const rendered = renderClientStories({ ...data, enabled: true, stories: [{ ...sentinel, consentConfirmed: true }] });
  assert.match(rendered.navigation, /href="#pribehy"/);
  assert.match(rendered.section, /&lt;TEST&gt;/);
  assert.doesNotMatch(rendered.section, /<TEST>/);
  for (const paragraph of data.introduction) assert.ok(text(rendered.section).includes(paragraph));
});

test('Build obsahuje veřejné reference, nikoli jejich zdrojová data', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  const built = await readFile(new URL('dist/index.html', root), 'utf8');
  assert.equal((await readFile(new URL('dist/ochrana-osobnich-udaju/index.html', root), 'utf8')).replace(/\u00a0/g, ' '), await readFile(new URL('ochrana-osobnich-udaju/index.html', root), 'utf8'));
  assert.doesNotMatch(built, /TODO|imperium@isb7\.cz/);
  assert.deepEqual((await readdir(new URL('dist/', root))).sort(), ['assets', 'contact.js', 'index.html', 'ochrana-osobnich-udaju', 'styles.css']);
  const data = JSON.parse(await readFile(new URL('data/client-stories.json', root), 'utf8'));
  if (data.enabled) {
    assert.match(built, /id="pribehy"/);
    assert.match(built, /href="#pribehy"/);
    assert.deepEqual([...built.matchAll(/<blockquote><p>([\s\S]*?)<\/p><\/blockquote>/g)].map(m => m[1]), data.stories.map(story => story.review));
    assert.ok(built.indexOf('id="lucie"') < built.indexOf('id="pribehy"'));
    assert.ok(built.indexOf('id="pribehy"') < built.indexOf('id="oblast"'));
  } else {
    assert.doesNotMatch(built, /Příběhy našich klientů|id="pribehy"|href="#pribehy"|client-stories|Za každou návštěvou/);
  }
  for (const { heading, paragraphs } of Object.values(copy)) {
    for (const value of [heading, ...paragraphs]) assert.ok(text(built).includes(value));
  }
  assert.equal(await readFile(new URL('dist/assets/STRIHNUTO-vodorovne-barevne.svg', root), 'utf8'), await readFile(new URL('assets/STRIHNUTO-vodorovne-barevne.svg', root), 'utf8'));
});


test('Úvod a fungování mají přesně schválené samostatné odstavce', () => {
  for (const id of ['uvod', 'jak-fungujeme']) {
    const section = html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</section>`))[1];
    const paragraphs = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
      .filter(([tag]) => !tag.includes('class="eyebrow"'))
      .map(([, content]) => text(content));
    assert.deepEqual(paragraphs, copy[id].paragraphs);
  }
});

test('Název, celé jméno a adresa v patičce odpovídají v0.3; působnost se nemění', async () => {
  assert.doesNotMatch(html, /STŘIHNUTO/);
  assert.match(html, /<title>Střihnuto\.cz/);
  assert.match(html, /alt="Střihnuto, z\. s\."/);
  assert.match(html, /aria-label="Střihnuto — úvod"/);
  assert.equal((text(html).match(/Lucie Tesařová/g) || []).length, 2);
  const footer = text(html.match(/<footer>[\s\S]*?<\/footer>/)[0]);
  assert.ok(footer.includes('Střihnuto, z. s. IČO: 30204101 Blahoslavova 430, Moravské Budějovice'));
  assert.ok(footer.includes('made by ISB7'));
  assert.ok(!footer.includes('Okres Třebíč'));
  assert.equal((html.match(/Blahoslavova 430, Moravské Budějovice/g) || []).length, 1);
  const area = html.match(/<section[^>]*id="oblast"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.match(area, /na území celého okresu Třebíč/);
  assert.match(area, /Okres Třebíč/);
  const stories = await readFile(new URL('data/client-stories.json', root), 'utf8');
  assert.doesNotMatch(stories, /STŘIHNUTO/);
});
