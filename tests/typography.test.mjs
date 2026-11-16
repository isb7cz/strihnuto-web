import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { czechTypography, typographyHtml } from '../scripts/typography.mjs';
const normalize = value => value.replace(/\u00a0/g, ' ');

test('České jednopísmenné výrazy včetně velkých variant zůstávají s následujícím slovem', () => {
  const letters = 'k s v z o u a i K S V Z O U A I'.split(' ');
  for (const letter of letters) assert.equal(czechTypography(`(${letter} text)`), `(${letter}\u00a0text)`);
  assert.equal(czechTypography('a i v obci'), 'a\u00a0i\u00a0v\u00a0obci');
  assert.equal(czechTypography('Lucie nebo kdo'), 'Lucie nebo kdo');
  assert.equal(typographyHtml('v <a href="/">Ochraně</a> údajů'), 'v\u00a0<a href="/">Ochraně</a> údajů');
});

test('Datum, číselné vazby a označení spolku používají krátké typografické celky', () => {
  assert.equal(czechTypography('čl. 6 odst. 1 písm. b)'), 'čl.\u00a06 odst.\u00a01 písm.\u00a0b)');
  assert.equal(czechTypography('16. listopadu 2026.'), '16.\u00a0listopadu\u00a02026.');
  assert.equal(czechTypography('25 lety praxe, 12 měsíců, 50 Kč'), '25\u00a0lety praxe, 12\u00a0měsíců, 50\u00a0Kč');
  assert.equal(czechTypography('Střihnuto, z. s. IČO: 30204101'), 'Střihnuto, z.\u00a0s. IČO:\u00a030204101');
});

test('Typografie mění pouze mezery; zachovává HTML, URL, technické atributy a přesné znění obou stránek', async () => {
  for (const file of ['index.html', 'ochrana-osobnich-udaju/index.html']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    const output = typographyHtml(source);
    assert.equal(normalize(output), source);
    assert.equal(typographyHtml(output), output, 'Opakované zpracování je stabilní');
    assert.ok(output.includes('\u00a0'));
    assert.deepEqual([...output.matchAll(/(?:href|src|srcset|id|class)="[^"]*"/g)].map(m => m[0]), [...source.matchAll(/(?:href|src|srcset|id|class)="[^"]*"/g)].map(m => m[0]));
  }
  const html = '<script>const x="v test";</script><style>.a { content:"v test"; }</style><!-- v test -->';
  assert.equal(typographyHtml(html), html);
});
