import DOMPurify from 'dompurify';

// Rich-text helpers for fields edited with components/ui/RichTextEditor (News, advertisement
// Important Notes / Terms & Conditions). Values saved before the editor existed are plain
// text, so every helper accepts both plain text and HTML.

const HTML_TAG = /<\/?[a-z][\s\S]*?>/i;

/** True when the value contains HTML markup (as saved by the rich-text editor). */
export const isHtml = (value) => typeof value === 'string' && HTML_TAG.test(value);

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * HTML for the editor / renderer: HTML is returned as is; plain text (legacy values) is
 * escaped with its line breaks kept, so it looks the same as before.
 */
export const toRichHtml = (value) => {
  if (value == null || value === '') return '';
  const text = String(value);
  return isHtml(text) ? text : escapeHtml(text).replace(/\r?\n/g, '<br>');
};

// Links opening a new tab must not get a handle on this page.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Safe HTML for display: scripts, event handlers and javascript: URLs are removed. */
export const sanitizeRichHtml = (value) =>
  DOMPurify.sanitize(toRichHtml(value), { ADD_ATTR: ['target'], FORBID_TAGS: ['style', 'form', 'input', 'button'] });

/** Plain text of a rich-text value (table cells, previews, confirmation dialogs). */
export const richTextToPlain = (value) => {
  if (!value) return '';
  if (!isHtml(value)) return String(value);
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(String(value).replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '$&\n'));
  return (div.textContent || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
};

/** True when the editor holds nothing but whitespace / empty tags (and no image). */
export const isRichTextEmpty = (value) =>
  !value || (richTextToPlain(value).trim() === '' && !/<img\b/i.test(String(value)));
