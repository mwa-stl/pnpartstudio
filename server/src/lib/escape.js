/** Escapes user-supplied text before it is placed in an HTML email body. */
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Same, with newlines kept as line breaks — for free-text message bodies. */
export const escapeHtmlMultiline = (value) => escapeHtml(value).replace(/\r?\n/g, '<br />');

/** Strips CR/LF and quotes so a value is safe inside a mail header. */
export const headerSafe = (value, max = 120) =>
  String(value ?? '').replace(/[\r\n"<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
