import createDOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window as unknown as Window & typeof globalThis;
const DOMPurify = createDOMPurify(window);

const allowedTags = [
  'a', 'p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'pre', 'code', 'img', 'br', 'hr'
];

export function sanitizeToKindle(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    FORBID_TAGS: ['script', 'style', 'link', 'noscript', 'iframe', 'svg', 'form'],
    // Remove all attributes not in allowlist
    ADD_ATTR: [],
  });

  // Strip remaining attributes like class, id, style, on*
  // Use a DOM to remove offending attributes.
  const dom = new JSDOM(`<body>${clean}</body>`);
  const body = dom.window.document.body;
  body.querySelectorAll('*').forEach((el: Element) => {
    // Preserve only href/src/alt/title
    Array.from(el.attributes).forEach((attr) => {
      if (!['href', 'src', 'alt', 'title'].includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return body.innerHTML;
}
