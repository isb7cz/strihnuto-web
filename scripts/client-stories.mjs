/** Build-only rendering: drafts and unpublished data never enter the public bundle. */
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export function renderClientStories(data) {
  if (data.enabled !== true) return { section: '', navigation: '' };
  if (!Array.isArray(data.stories) || data.stories.length === 0) {
    throw new Error('Příběhy nelze zapnout bez skutečného příběhu.');
  }
  const fields = ['clientLabel', 'service', 'review'];
  const cards = data.stories.map(story => {
    if (story.consentConfirmed !== true) throw new Error('Chybí potvrzení souhlasu klienta.');
    for (const field of fields) {
      if (typeof story[field] !== 'string' || !story[field].trim()) {
        throw new Error(`Příběhu chybí pole ${field}.`);
      }
    }
    const type = story.type ?? 'story';
    if (!['quote', 'story'].includes(type)) throw new Error('Neznámý typ reference.');
    for (const field of ['approximateAge', 'area', 'situation']) {
      if (story[field] !== undefined && (typeof story[field] !== 'string' || !story[field].trim())) {
        throw new Error(`Příběh má neplatné pole ${field}.`);
      }
    }
    if (type === 'quote') {
      return `<article class="card client-story client-reference">
        <blockquote><p>${escapeHtml(story.review)}</p></blockquote>
        <div class="reference-attribution"><h3>${escapeHtml(story.clientLabel)}</h3>
        <p class="reference-service">${escapeHtml(story.service)}</p></div>
      </article>`;
    }
    const metadata = [story.approximateAge, story.area].filter(Boolean).map(escapeHtml).join(' · ');
    return `<article class="card client-story">
      <h3>${escapeHtml(story.clientLabel)}</h3>
      ${metadata ? `<p class="story-meta">${metadata}</p>` : ''}
      ${story.situation ? `<p>${escapeHtml(story.situation)}</p>` : ''}
      <p>${escapeHtml(story.service)}</p>
      <blockquote><p>${escapeHtml(story.review)}</p></blockquote>
    </article>`;
  });
  if (typeof data.heading !== 'string' || !Array.isArray(data.introduction) ||
      data.introduction.some(text => typeof text !== 'string')) {
    throw new Error('Chybí nadpis nebo úvod příběhů.');
  }
  return {
    navigation: `<a href="#pribehy">${escapeHtml(data.heading)}</a>`,
    section: `<section class="section cream" id="pribehy" aria-labelledby="pribehy-title">
      <div class="container"><h2 id="pribehy-title">${escapeHtml(data.heading)}</h2>
      <div class="section-intro">${data.introduction.map(text => `<p>${escapeHtml(text)}</p>`).join('')}</div>
      <div class="cards">${cards.join('')}</div></div>
    </section>`
  };
}
