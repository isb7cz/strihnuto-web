import test from 'node:test';
import assert from 'node:assert/strict';
import { handleContact } from '../worker/contact.mjs';
const env = { SITE_ORIGIN: 'https://example.test', TURNSTILE_SECRET_KEY: 'test-secret', MAIL_FROM: 'form@example.test', CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) } };
const valid = { name: 'TEST', phone: '+420 123 456 789', email: '', town: 'TEST', 'request-type': 'standard', message: 'TEST\nDruhý řádek', token: 'test-token', website: '' };
function request(data = valid, headers = {}, method = 'POST') {
  return new Request('https://example.test/api/contact', { method, headers: { Origin: env.SITE_ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, ...(method === 'POST' ? { body: typeof data === 'string' ? data : JSON.stringify(data) } : {}) });
}
function setup(overrides = {}) {
  const sent = [], verified = [];
  const deps = { sendMail: async mail => { sent.push(mail); }, verifyFetch: async (url, options) => {
    verified.push({ url, options });
    return Response.json({ success: true, hostname: 'example.test', action: 'contact' });
  }, ...overrides };
  return { sent, verified, deps };
}

test('Úspěch až po přijetí odesílací službou, všechny údaje a obě kategorie, email nepovinný', async () => {
  for (const type of ['standard', 'supported']) {
    const s = setup(); const data = { ...valid, 'request-type': type, ...(type === 'supported' ? { email: 'test@example.test' } : {}) };
    const response = await handleContact(request(data), env, s.deps);
    assert.equal(response.status, 200);
    assert.equal(s.sent.length, 1);
    assert.equal(s.sent[0].to, 'imperium@isb7.cz');
    assert.equal(s.sent[0].replyTo, data.email || undefined);
    for (const field of ['name', 'phone', 'town', 'message']) assert.ok(s.sent[0].text.includes(data[field]));
    assert.ok(s.sent[0].subject.includes(type === 'standard' ? 'Běžné služby' : 'Zájem o zvýhodněnou péči'));
    assert.equal(s.verified[0].options.body.get('secret'), env.TURNSTILE_SECRET_KEY);
    assert.equal(s.verified[0].options.body.get('response'), valid.token);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.ok(!(await response.text()).includes(env.TURNSTILE_SECRET_KEY));
  }
});

test('Neúspěch nebo výpadek e-mailu nikdy nevrátí potvrzení úspěchu', async () => {
  const s = setup({ sendMail: async () => { throw new Error('provider failure'); } });
  const response = await handleContact(request(), env, s.deps);
  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /nepodařilo/);
});

test('Odpověď čeká na skutečné dokončení sendMail', async () => {
  let finish; let completed = false;
  const pending = new Promise(resolve => { finish = resolve; });
  const s = setup({ sendMail: () => pending });
  const result = handleContact(request(), env, s.deps).then(r => { completed = true; return r; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(completed, false); finish(); assert.equal((await result).status, 200);
});

test('Server odmítá chybějící povinná pole, nesprávný email, CRLF, příliš dlouhé texty a honeypot', async () => {
  for (const patch of [{ name: '' }, { phone: 'abc' }, { email: 'bad' }, { email: 'a@example.test\r\nBcc:x@example.test' }, { email: 'a,b@example.test' }, { town: '' }, { message: '' }, { message: 'x'.repeat(3001) }, { token: '' }, { 'request-type': 'other' }, { website: 'spam' }, { name: 4 }]) {
    const s = setup();
    assert.equal((await handleContact(request({ ...valid, ...patch }), env, s.deps)).status, 400);
    assert.equal(s.sent.length, 0); assert.equal(s.verified.length, 0);
  }
});

test('Omezení velikosti funguje i bez Content-Length, neplatný JSON se odmítá', async () => {
  const s = setup();
  assert.equal((await handleContact(request('x'.repeat(12001)), env, s.deps)).status, 413);
  assert.equal((await handleContact(request('{'), env, s.deps)).status, 400);
  assert.equal(s.sent.length, 0);
});

test('Turnstile: chybný, expirovaný nebo znovu použitý token, cizí hostname a action nesmí odeslat email', async () => {
  for (const verification of [{ success: false, 'error-codes': ['timeout-or-duplicate'] }, { success: true, hostname: 'wrong.test', action: 'contact' }, { success: true, hostname: 'example.test', action: 'other' }]) {
    const s = setup({ verifyFetch: async () => Response.json(verification) });
    assert.equal((await handleContact(request(), env, s.deps)).status, 403);
    assert.equal(s.sent.length, 0);
  }
});

test('Výpadek ověření nebo limitu je bezpečné odmítnutí', async () => {
  for (const verifyFetch of [async () => { throw new Error('offline'); }, async () => new Response('', { status: 503 })]) {
    const s = setup({ verifyFetch });
    assert.equal((await handleContact(request(), env, s.deps)).status, 503);
    assert.equal(s.sent.length, 0);
  }
  const s = setup();
  assert.equal((await handleContact(request(), { ...env, CONTACT_RATE_LIMITER: { limit: async () => { throw new Error(); } } }, s.deps)).status, 503);
  assert.equal(s.sent.length, 0);
});

test('Rate limit odmítá opakované požadavky, používá hash IP a neověřuje ani neposílá', async () => {
  const s = setup(); let limitKey;
  const response = await handleContact(request(), { ...env, CONTACT_RATE_LIMITER: { limit: async ({ key }) => { limitKey = key; return { success: false }; } } }, s.deps);
  assert.equal(response.status, 429); assert.match(limitKey, /^[a-f0-9]{64}$/);
  assert.equal(s.sent.length, 0); assert.equal(s.verified.length, 0);
});

test('Origin, typ obsahu a metoda jsou kontrolovány', async () => {
  const s = setup();
  assert.equal((await handleContact(request(valid, { Origin: 'https://wrong.test' }), env, s.deps)).status, 403);
  assert.equal((await handleContact(request(valid, { 'Content-Type': 'text/plain' }), env, s.deps)).status, 415);
  assert.equal((await handleContact(request(valid, {}, 'GET'), env, s.deps)).status, 405);
  assert.equal(s.sent.length, 0);
});

test('Chybějící tajný klíč nebo bindingy blokují odeslání', async () => {
  const s = setup();
  for (const key of ['TURNSTILE_SECRET_KEY', 'MAIL_FROM', 'SITE_ORIGIN', 'CONTACT_RATE_LIMITER']) {
    assert.equal((await handleContact(request(), { ...env, [key]: undefined }, s.deps)).status, 503);
  }
  assert.equal((await handleContact(request(), env, { verifyFetch: s.deps.verifyFetch })).status, 503);
  assert.equal(s.sent.length, 0);
});
