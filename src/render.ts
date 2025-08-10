import type { Request, Response } from 'express';
import { isValidAcoupUrl, fetchWithTimeout } from './utils';
import { extractAcoupPost } from './wp-acoup';
import { sanitizeToKindle } from './sanitize';
import { toAbsoluteUrls, rewriteImages } from './kindle';

export async function renderRouteHandler(req: Request, res: Response) {
  try {
    const rawUrl = String(req.query.url || '');
    const images = String(req.query.images || 'on');

    if (!rawUrl || !isValidAcoupUrl(rawUrl)) {
      return sendHtml(
        res.status(400),
        renderError('Invalid or non-whitelisted URL. Only https://acoup.blog/ is allowed.')
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const html = await fetchWithTimeout(rawUrl, {
      signal: controller.signal,
      headers: {
        'user-agent': 'ACoup-Kindle-Renderer/0.1 (+contact)'
      }
    });

    clearTimeout(timeout);

    const extracted = extractAcoupPost(html, rawUrl);
    if (!extracted.contentHtml || extracted.contentHtml.trim().length === 0) {
      return sendHtml(res.status(422), renderError('Failed to extract article content.'));
    }

    // 1) Rewrite images (lazy-load, non-webp, unwrap figure/picture)
    let processed = rewriteImages(extracted.contentHtml, { allowImages: images !== 'off' });
    // 2) Absolutize URLs
    processed = toAbsoluteUrls(processed, rawUrl);
    // 3) Sanitize last
    processed = sanitizeToKindle(processed);

    const doc = renderDocument({
      title: extracted.title,
      author: extracted.author,
      date: extracted.date,
      originalUrl: rawUrl,
      bodyHtml: processed
    });

    return sendHtml(res.status(200), doc);
  } catch (err: any) {
    const status = err?.name === 'AbortError' ? 504 : 502;
    return sendHtml(res.status(status), renderError('Failed to fetch or process the page. Please try again.'));
  }
}

function sendHtml(res: Response, body: string) {
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; img-src https: data:; style-src 'none'; script-src 'none'",
    'X-Robots-Tag': 'noindex, noarchive'
  });
  return res.send(body);
}

function renderDocument(opts: { title: string; author?: string; date?: string; originalUrl: string; bodyHtml: string }) {
  const { title, author, date, originalUrl, bodyHtml } = opts;
  const meta = [author && `by ${author}`, date].filter(Boolean).join(' • ');
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p><a href="${originalUrl}">Original</a>${meta ? ` — ${escapeHtml(meta)}` : ''}</p>
  ${bodyHtml}
</body>
</html>`;
}

function renderError(message: string) {
  const title = 'ACOUP Reader Error';
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${title}</title>
<body>
  <h1>${title}</h1>
  <p>${escapeHtml(message)}</p>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
