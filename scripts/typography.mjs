/** Czech typographic spacing only. No changes to wording or punctuation. */
export function czechTypography(text) {
  return text
    .replace(/(?<![\p{L}\p{N}_])([ksvzouai]) +(?=\S|$)/giu, '$1\u00a0')
    .replace(/\bz\. +s\./g, 'z.\u00a0s.')
    .replace(/\b(IČO:) +(\d)/g, '$1\u00a0$2')
    .replace(/(?<![\p{L}\p{N}_])(čl\.|odst\.|písm\.) +(?=[\da-z])/gu, '$1\u00a0')
    .replace(/(\d) +(?=(?:let|lety|měsíců|měsíce|Kč|%|kg|km|cm|mm|px)(?![\p{L}\p{N}]))/gu, '$1\u00a0')
    .replace(/(\d{1,2}\.) +(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince) +(\d{4})/g, '$1\u00a0$2\u00a0$3');
}

/** Touch text nodes and human-readable attributes only, never paths or technical attributes. */
export function typographyHtml(html) {
  let skip = false;
  return html.replace(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g, part => {
    if (part.startsWith('<!--')) return part;
    if (part.startsWith('<')) {
      if (/^<(script|style)\b/i.test(part)) skip = true;
      if (/^<\/(script|style)\b/i.test(part)) skip = false;
      if (skip) return part;
      let result = part.replace(/\b(alt|title|aria-label)="([^"]*)"/g, (_, name, value) => `${name}="${czechTypography(value)}"`);
      if (/^<meta\b/.test(result) && /(?:name="description"|property="og:(?:title|description)")/.test(result)) {
        result = result.replace(/\bcontent="([^"]*)"/, (_, value) => `content="${czechTypography(value)}"`);
      }
      return result;
    }
    return skip ? part : czechTypography(part);
  });
}
