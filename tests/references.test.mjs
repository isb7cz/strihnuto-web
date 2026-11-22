import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderClientStories } from '../scripts/client-stories.mjs';
import { typographyHtml } from '../scripts/typography.mjs';
const data = JSON.parse(await readFile(new URL('../data/client-stories.json', import.meta.url), 'utf8'));
const expected = [
  { type: 'quote', clientLabel: 'Kristýna', service: 'melír', review: 'Ja jenom, ze ten melir je bozi!😍', consentConfirmed: true },
  { type: 'quote', clientLabel: 'Lída', service: 'společenské účesy', review: 'Luci, všechny tvoje účesy včera krásné. Holkám to moc slušelo.', consentConfirmed: true }
];

test('Zveřejněné jsou právě dvě schválené citace bez jakýchkoli doplněných údajů', () => {
  assert.equal(data.enabled, true);
  assert.deepEqual(data.stories, expected);
  const { section, navigation } = renderClientStories(data);
  assert.ok(navigation.includes(data.heading));
  assert.equal((section.match(/class="card client-story client-reference"/g) || []).length, 2);
  assert.doesNotMatch(section, /<img\b|<a\b|story-meta|<iframe\b|★/);
  for (const story of expected) {
    assert.ok(section.includes(`<blockquote><p>${story.review}</p></blockquote>`));
    assert.ok(section.indexOf(story.review) < section.indexOf(`<h3>${story.clientLabel}</h3>`));
  }
});

test('Krátké citace zůstávají doslovné i po typografickém buildu', () => {
  const rendered = renderClientStories(data).section;
  assert.deepEqual([...typographyHtml(rendered).matchAll(/<blockquote><p>([\s\S]*?)<\/p><\/blockquote>/g)].map(m => m[1]), expected.map(story => story.review));
  // Technical sentinel, not an invented published testimonial.
  const sentinel = '<blockquote><p>v TEST a TEST i TEST</p></blockquote>';
  assert.equal(typographyHtml(sentinel), sentinel);
});

test('Delší příběhy jsou podporované s dobrovolnými údaji, citace i metadata jsou escapované', () => {
  const base = { type: 'story', clientLabel: '<TEST>', service: '<TEST>', review: '<TEST>', consentConfirmed: true };
  const render = story => renderClientStories({ ...data, stories: [story] }).section;
  const minimal = render(base);
  assert.doesNotMatch(minimal, /story-meta|undefined|<TEST>/);
  assert.match(minimal, /&lt;TEST&gt;/);
  const full = render({ ...base, approximateAge: '<AGE>', area: '<AREA>', situation: '<SITUATION>' });
  assert.match(full, /&lt;AGE&gt; · &lt;AREA&gt;/);
  assert.match(full, /&lt;SITUATION&gt;/);
  assert.throws(() => render({ ...base, type: 'other' }), /Neznámý typ/);
  assert.throws(() => render({ ...base, consentConfirmed: false }), /souhlasu/);
  assert.throws(() => render({ ...base, area: 7 }), /neplatné pole area/);
});
