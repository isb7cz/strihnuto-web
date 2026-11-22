import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

test('Produkční konfigurace zachovává Worker a origin, API bindingy a obsahuje schváleného odesílatele a žádný tajný klíč', async () => {
  const root = new URL('../', import.meta.url);
  const source = await readFile(new URL('wrangler.jsonc', root), 'utf8');
  const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(config.name, 'strihnuto-web');
  assert.equal(config.main, 'worker/index.mjs');
  await access(new URL(config.main, root));
  assert.equal(config.workers_dev, true);
  assert.equal(config.keep_vars, true);
  assert.deepEqual(config.assets, { directory: './dist', binding: 'ASSETS', run_worker_first: ['/api/*'] });
  assert.deepEqual(config.vars, { SITE_ORIGIN: 'https://strihnuto.cz', MAIL_FROM: 'lucie@strihnuto.cz' });
  assert.deepEqual(config.send_email, [{ name: 'CONTACT_EMAIL', destination_address: 'imperium@isb7.cz' }]);
  assert.deepEqual(config.ratelimits, [{ name: 'CONTACT_RATE_LIMITER', namespace_id: '1001', simple: { limit: 3, period: 60 } }]);
  assert.equal(Object.hasOwn(config, 'routes'), false);
  assert.equal(Object.hasOwn(config, 'route'), false);
  assert.doesNotMatch(JSON.stringify(config), /TURNSTILE_SECRET_KEY|REPLACE_WITH/);
});

test('Produkční origin přijímá strihnuto.cz a odmítá původní origin i nesprávný Turnstile hostname', async () => {
  const { handleContact } = await import('../worker/contact.mjs');
  const config = JSON.parse((await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8')).replace(/^\s*\/\/.*$/gm, ''));
  const env = { ...config.vars, TURNSTILE_SECRET_KEY: 'test-secret', MAIL_FROM: 'test@example.test', CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) } };
  for (const [origin, hostname, expected] of [
    ['https://strihnuto.cz', 'strihnuto.cz', 200],
    ['https://strihnuto.cz', 'strihnuto-web.github-6b5.workers.dev', 403],
    ['https://strihnuto-web.github-6b5.workers.dev', 'strihnuto.cz', 403]
  ]) {
    let sent = 0;
    const request = new Request('https://strihnuto.cz/api/contact', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
      body: JSON.stringify({ name: 'TEST', phone: '123456789', email: '', town: 'TEST', 'request-type': 'standard', message: 'TEST', token: 'test-token', website: '' })
    });
    const result = await handleContact(request, env, {
      verifyFetch: async () => Response.json({ success: true, hostname, action: 'contact' }),
      sendMail: async message => { assert.equal(message.to, 'imperium@isb7.cz'); sent++; }
    });
    assert.equal(result.status, expected);
    assert.equal(sent, expected === 200 ? 1 : 0);
  }
});
