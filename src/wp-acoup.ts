import * as cheerio from 'cheerio';
import { fetchJsonWithTimeout } from './utils';

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

// When hitting the homepage, prefer using the WordPress REST API to load multiple latest posts (avoids lazy-loading issues)
export async function extractAcoupHomepage(baseUrl: string, limit = 5): Promise<ExtractedPost> {
  const apiUrl = 'https://acoup.blog/wp-json/wp/v2/posts?per_page=' + Math.max(1, Math.min(limit, 10));
  type WPPost = { id: number; date: string; title: { rendered: string }; content: { rendered: string }; link: string };

  const posts = await fetchJsonWithTimeout<WPPost[]>(apiUrl, {
    headers: {
      'user-agent': 'ACoup-Kindle-Renderer/0.1 (+contact)'
    }
  });

  // Concatenate the latest posts into a single document
  const parts: string[] = [];
  let title = 'ACOUP — Latest Posts';

  for (const p of posts) {
    const section = `
<section>
  <h2><a href="/render?url=${encodeURIComponent(p.link)}">${escapeHtml(p.title.rendered)}</a></h2>
  <p><em>${new Date(p.date).toLocaleDateString()}</em></p>
  ${p.content.rendered}
  <hr>
</section>
`;
    parts.push(section);
  }

  return {
    title,
    author: 'Bret Devereaux',
    date: undefined,
    contentHtml: parts.join('\n') || '<p>No posts found.</p>'
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
