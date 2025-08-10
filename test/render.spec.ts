import { describe, it, expect } from 'vitest';
import { sanitizeToKindle } from '../src/sanitize';
import { toAbsoluteUrls, rewriteImages } from '../src/kindle';

describe('pipeline basics', () => {
  it('sanitizes and keeps allowed tags', () => {
    const dirty = '<div class="x"><script>x</script><p style="c">Hi <strong>there</strong></p>';
    const clean = sanitizeToKindle(dirty);
    expect(clean).toContain('<p>Hi <strong>there</strong></p>');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('style=');
  });

  it('absolutizes links and images; strips utm_*; rewrites acoup.blog links to /render', () => {
    const html = '<a href="/foo?utm_source=x">x</a><img src="/img.png">';
    const out = toAbsoluteUrls(html, 'https://acoup.blog/post');
    // Link should be rewritten to our app route with encoded target
    expect(out).toContain('/render?url=');
    expect(out).toContain(encodeURIComponent('https://acoup.blog/foo'));
    // No UTM params should remain anywhere
    expect(out).not.toContain('utm_source');
    // Images should still be made absolute
    expect(out).toContain('https://acoup.blog/img.png');
  });

  it('can drop images', () => {
    const html = '<p>t</p><img src="x.webp">';
    const out = rewriteImages(html, { allowImages: false });
    expect(out).toContain('<p>t</p>');
    expect(out).not.toContain('<img');
  });
});
