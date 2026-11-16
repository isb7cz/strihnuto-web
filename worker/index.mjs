import { EmailMessage } from 'cloudflare:email';
import { handleContact } from './contact.mjs';

function encode(value) {
  return btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(''));
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/contact') {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Not found', { status: 404 });
    }
    return handleContact(request, env, {
      sendMail: env.CONTACT_EMAIL?.send ? async mail => {
        // User content is base64 encoded, addresses validated, subject selected from fixed values.
        const raw = [
          `From: ${mail.from}`, `To: ${mail.to}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: <${crypto.randomUUID()}@${mail.from.split('@')[1]}>`,
          ...(mail.replyTo ? [`Reply-To: ${mail.replyTo}`] : []),
          `Subject: =?UTF-8?B?${encode(mail.subject)}?=`,
          'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: base64', '', encode(mail.text).match(/.{1,76}/g).join('\r\n'), ''
        ].join('\r\n');
        await env.CONTACT_EMAIL.send(new EmailMessage(mail.from, mail.to, raw));
      } : undefined
    });
  }
};
