// src/common/tokens.js
export function replaceTokenAll(html, token, value) {
  if (html == null) return '';
  const esc = token.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html
    .replace(new RegExp(escapeRe(token), 'g'), value)
    .replace(new RegExp(escapeRe(esc), 'g'), value);
}
