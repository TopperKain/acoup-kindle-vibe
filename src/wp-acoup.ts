import * as cheerio from 'cheerio';

export interface ExtractedPost {
  title: string;
  author?: string;
  date?: string;
  contentHtml: string;
}

export function extractAcoupPost(html: string, baseUrl: string): ExtractedPost {
  const $ = cheerio.load(html);

  // Title
  const title = $('h1.entry-title, h1.post-title, article h1, head > title').first().text().trim() || 'Untitled';

  // Author and date (best-effort)
  const author = $('[rel="author"], .author, .byline .author-name').first().text().trim() || undefined;
  const date = $('time[datetime], .posted-on time, .entry-date, .dateline').first().text().trim() || undefined;

  // Main content: typical WordPress selectors
  const main = $('.entry-content, article .entry-content, article, .post').first();
  let content = main.length ? main.html() || '' : $('article').first().html() || '';
  if (!content) {
    // Fallback to body if we cannot find article container
    content = $('body').html() || '';
  }

  return {
    title,
    author,
    date,
    contentHtml: content,
  };
}
