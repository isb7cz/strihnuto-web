const form = document.querySelector('.contact-form');
const button = form.querySelector('button[type="submit"]');
const status = document.querySelector('#form-status');
let token = '';
let busy = false;
let widget;
let attempted = false;
const setStatus = message => { status.textContent = message.replace(/(?<![\p{L}\p{N}_])([ksvzouai]) +(?=\S)/giu, '$1\u00a0'); };
window.onContactTurnstileLoad = () => {
  widget = window.turnstile.render('#contact-turnstile', {
    sitekey: '0x4AAAAAAGCCjx_5Khzyd-a-', action: 'contact', language: 'cs', size: 'compact',
    callback(value) { token = value; button.disabled = busy; if (!attempted) setStatus('Ověření proběhlo. Poptávku můžete odeslat.'); },
    'expired-callback'() { token = ''; button.disabled = true; setStatus('Ověření vypršelo. Proveďte jej prosím znovu.'); },
    'error-callback'() { token = ''; button.disabled = true; setStatus('Ověření nelze načíst. Zkontrolujte připojení nebo to zkuste později.'); }
  });
};
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !token || !form.reportValidity()) return;
  attempted = true; busy = true; button.disabled = true; setStatus('Předáváme poptávku k odeslání…');
  const data = Object.fromEntries(new FormData(form));
  data.token = token;
  try {
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(25000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Odesílání není dostupné. Zkuste to prosím později.');
    if (response.status !== 200 || typeof result.message !== 'string') throw new Error('Odeslání nelze potvrdit.');
    form.reset(); setStatus(result.message);
  } catch (error) {
    setStatus(error instanceof SyntaxError || error instanceof TypeError || error.name === 'TimeoutError' || error.name === 'AbortError'
      ? 'Odeslání nelze potvrdit. Zkontrolujte připojení. Před opakováním ověřte, zda poptávka již nepřišla.'
      : error.message);
  } finally {
    token = ''; busy = false; button.disabled = true;
    if (window.turnstile && widget !== undefined) window.turnstile.reset(widget);
  }
});
