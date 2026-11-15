/** Build-only rendering: drafts and unpublished data never enter the public bundle. */
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export function renderClientStories(data) {
  if (data.enabled !== true) return { section: '', navigation: '' };
  if (!Array.isArray(data.stories) || data.stories.length === 0) {
    throw new Error('Příběhy nelze zapnout bez skutečného příběhu.');
  }
  const fields = ['clientLabel', 'approximateAge', 'area', 'situation', 'service', 'review'];
  const cards = data.stories.map(story => {
    if (story.consentConfirmed !== true) throw new Error('Chybí potvrzení souhlasu klienta.');
    for (const field of fields) {
      if (typeof story[field] !== 'string' || !story[field].trim()) {
        throw new Error(`Příběhu chybí pole ${field}.`);
      }
    }
    return `<article class="card client-story">
      <h3>${escapeHtml(story.clientLabel)}</h3>
      <p class="story-meta">${escapeHtml(story.approximateAge)} · ${escapeHtml(story.area)}</p>
      <p>${escapeHtml(story.situation)}</p>
      <p>${escapeHtml(story.service)}</p>
      <blockquote><p>${escapeHtml(story.review)}</p></blockquote>
    </article>`;
  });
  if (typeof data.heading !== 'string' || !Array.isArray(data.introduction) ||
      data.introduction.some(text => typeof text !== 'string')) {
    throw new Error('Chybí nadpis nebo úvod příběhů.');
  }
  return {
    navigation: '<a href="#pribehy">Příběhy našich klientů</a>',
    section: `<section class="section cream" id="pribehy" aria-labelledby="pribehy-title">
      <div class="container"><h2 id="pribehy-title">${escapeHtml(data.heading)}</h2>
      <div class="section-intro">${data.introduction.map(text => `<p>${escapeHtml(text)}</p>`).join('')}</div>
      <div class="cards">${cards.join('')}</div></div>
    </section>`
  };
}
