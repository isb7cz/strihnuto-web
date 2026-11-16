import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

test('Produkční konfigurace zachovává Worker a origin, API bindingy a neobsahuje tajný klíč ani vymyšleného odesílatele', async () => {
  const root = new URL('../', import.meta.url);
  const source = await readFile(new URL('wrangler.jsonc', root), 'utf8');
  const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(config.name, 'strihnuto-web');
  assert.equal(config.main, 'worker/index.mjs');
  await access(new URL(config.main, root));
  assert.equal(config.workers_dev, true);
  assert.equal(config.keep_vars, true);
  assert.deepEqual(config.assets, { directory: './dist', binding: 'ASSETS', run_worker_first: ['/api/*'] });
  assert.deepEqual(config.vars, { SITE_ORIGIN: 'https://strihnuto-web.github-6b5.workers.dev' });
  assert.deepEqual(config.send_email, [{ name: 'CONTACT_EMAIL', destination_address: 'imperium@isb7.cz' }]);
  assert.deepEqual(config.ratelimits, [{ name: 'CONTACT_RATE_LIMITER', namespace_id: '1001', simple: { limit: 3, period: 60 } }]);
  assert.equal(Object.hasOwn(config, 'routes'), false);
  assert.equal(Object.hasOwn(config, 'route'), false);
  assert.doesNotMatch(JSON.stringify(config), /TURNSTILE_SECRET_KEY|MAIL_FROM|REPLACE_WITH/);
});
