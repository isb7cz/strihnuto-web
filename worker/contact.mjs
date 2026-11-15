const RECIPIENT = 'imperium@isb7.cz';
const TYPES = { standard: 'Běžné služby', supported: 'Zájem o zvýhodněnou péči' };
const json = (status, message) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;

async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > 12000) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let bytes = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 12000) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(merged));
}

function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const result = {};
  for (const [key, min, max] of [['name', 1, 100], ['phone', 7, 40], ['email', 0, 254], ['town', 1, 120], ['message', 1, 3000], ['token', 1, 2048]]) {
    if (typeof data[key] !== 'string') return null;
    const value = data[key].trim();
    if (value.length < min || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return null;
    if (key !== 'message' && /[\r\n]/.test(value)) return null;
    result[key] = value;
  }
  if (!/^[+\d ()\-./]+$/.test(result.phone) || result.phone.replace(/\D/g, '').length < 7) return null;
  if (result.email && !emailPattern.test(result.email)) return null;
  if (!Object.hasOwn(TYPES, data['request-type'])) return null;
  if (typeof data.website !== 'string' || data.website !== '') return null;
  result.type = TYPES[data['request-type']];
  return result;
}

// Dependencies are injected in tests; no emails or verification calls are mocked in production.
export async function handleContact(request, env, { sendMail, verifyFetch = fetch } = {}) {
  if (request.method !== 'POST') return json(405, 'Použijte prosím kontaktní formulář.');
  if (!env.SITE_ORIGIN || !env.TURNSTILE_SECRET_KEY || !env.MAIL_FROM ||
      !env.CONTACT_RATE_LIMITER?.limit || !sendMail) return json(503, 'Odesílání nyní není dostupné. Zkuste to prosím později.');
  let origin;
  try {
    origin = new URL(env.SITE_ORIGIN);
    if (origin.protocol !== 'https:' || origin.origin !== env.SITE_ORIGIN || !emailPattern.test(env.MAIL_FROM) || /[\r\n]/.test(env.MAIL_FROM)) throw new Error('config');
  } catch { return json(503, 'Odesílání nyní není dostupné. Zkuste to prosím později.'); }
  if (request.headers.get('Origin') !== origin.origin || new URL(request.url).origin !== origin.origin) return json(403, 'Požadavek nelze ověřit. Obnovte prosím stránku.');
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return json(415, 'Požadavek má nesprávný formát.');
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return json(503, 'Požadavek nyní nelze ověřit. Zkuste to prosím později.');
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    const limit = await env.CONTACT_RATE_LIMITER.limit({ key });
    if (!limit.success) return json(429, 'Odesíláte příliš často. Počkejte prosím alespoň minutu.');
  } catch { return json(503, 'Odesílání nyní není dostupné. Zkuste to prosím později.'); }
  let data;
  try { data = validate(await readBody(request)); }
  catch (error) { return json(error.message === 'size' ? 413 : 400, 'Zkontrolujte prosím vyplněné údaje a délku zprávy.'); }
  if (!data) return json(400, 'Zkontrolujte prosím všechna povinná pole, telefon a případný e-mail.');
  let verification;
  try {
    const response = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: data.token, remoteip: ip }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('verify');
    verification = await response.json();
  } catch { return json(503, 'Ověření proti spamu nyní není dostupné. Zkuste to prosím později.'); }
  if (verification.success !== true || verification.hostname !== origin.hostname || verification.action !== 'contact') return json(403, 'Ověření proti spamu vypršelo nebo se nezdařilo. Zkuste jej prosím znovu.');
  const content = [
    `Typ poptávky: ${data.type}`, `Jméno: ${data.name}`, `Telefon: ${data.phone}`,
    `E-mail: ${data.email || 'Neuveden'}`, `Obec: ${data.town}`, '', 'Popis požadavku:', data.message,
    '', 'Poptávka z formuláře Střihnuto. Nejde o potvrzení termínu.'
  ].join('\n');
  try {
    await sendMail({ from: env.MAIL_FROM, to: RECIPIENT, replyTo: data.email || undefined,
      subject: `Střihnuto – ${data.type}`, text: content });
  } catch { return json(502, 'Zprávu se nepodařilo předat k odeslání. Údaje zůstaly ve formuláři; zkuste to prosím později.'); }
  return json(200, 'Poptávka byla předána e-mailové službě k odeslání. Odeslání neznamená potvrzení termínu.');
}
