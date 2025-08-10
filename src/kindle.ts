import * as cheerio from 'cheerio';
import type { Element as CheerioElement } from 'domhandler';

export function toAbsoluteUrls(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  $('a[href]').each((_: number, el: CheerioElement) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;
      const abs = new URL(href, base).toString();
      const cleaned = stripTracking(abs);
      // If link points to acoup.blog, rewrite to our app route to keep navigation inside the app
      try {
        const u = new URL(cleaned);
        if (u.hostname === 'acoup.blog') {
          $(el).attr('href', `/render?url=${encodeURIComponent(u.toString())}`);
        } else {
          $(el).attr('href', cleaned);
        }
      } catch {
        $(el).attr('href', cleaned);
      }
    } catch {}
  });
  $('img[src]').each((_: number, el: CheerioElement) => {
    try {
      const src = $(el).attr('src');
      if (!src) return;
      const abs = new URL(src, base).toString();
      $(el).attr('src', abs);
    } catch {}
  });
  return $.html();
}

export function rewriteImages(html: string, opts: { allowImages: boolean }): string {
  const $ = cheerio.load(html);

  if (!opts.allowImages) {
    $('img').remove();
    return $.html();
  }

  // Pick non-WebP sources and normalize lazy-loaded images
  $('img').each((_: number, el: CheerioElement) => {
    const $el = $(el);
    const dataSrc = $el.attr('data-src') || $el.attr('data-lazy-src') || $el.attr('data-original');
    if (dataSrc && !$el.attr('src')) {
      $el.attr('src', dataSrc);
    }

    const src = $el.attr('src');
    if (src && src.trim().toLowerCase().endsWith('.webp')) {
      // Try to find a sibling source with jpg/png/gif if present in picture
      const parent = $el.parent('picture');
      if (parent.length) {
        const candidate = parent
          .find('source[type="image/jpeg"], source[type="image/png"], source[type="image/gif"]')
          .first()
          .attr('srcset');
        if (candidate) {
          const first = candidate.split(',')[0].trim().split(' ')[0];
          $el.attr('src', first);
        }
      }
    }

    // Ensure alt exists
    if (!$el.attr('alt')) {
      $el.attr('alt', '');
    }
  });

  // Unwrap picture/figure
  $('picture').each((_: number, el: CheerioElement) => {
    const img = $(el).find('img').first();
    if (img.length) {
      $(el).replaceWith(img);
    } else {
      $(el).remove();
    }
  });

  $('figure').each((_: number, el: CheerioElement) => {
    const img = $(el).find('img').first();
    const caption = $(el).find('figcaption').first();
    const parts: string[] = [];
    if (img.length) parts.push($.html(img));
    if (caption.length) parts.push(`<p>${caption.text()}</p>`);
    if (parts.length) $(el).replaceWith(parts.join('\n'));
  });

  return $.html();
}

function stripTracking(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.forEach((_, k) => {
      if (k.toLowerCase().startsWith('utm_')) u.searchParams.delete(k);
    });
    return u.toString();
  } catch {
    return url;
  }
}
