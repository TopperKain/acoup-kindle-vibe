
# Project: ACOUP Reader (Kindle-Friendly Renderer)

## 1) Objective

Create a minimal web service that **fetches and simplifies posts from `https://acoup.blog/`** and serves them as **plain, safe, Kindle-friendly HTML**:

*   **No JavaScript**
*   **No CSS** (no `<style>`, no inline `style=`)
*   **Readable text and images only**
*   **Single-column, semantic HTML** for legacy/limited browsers (Kindle Paperwhite)

## 2) Scope

**In**

*   Only **`https://acoup.blog/`** URLs (domain-restricted)
*   Server-side fetch, extract main article content, sanitize, flatten
*   Plain HTML output with title, author (if available), date (if available), body, images
*   Images preserved but converted to **absolute URLs**; support **toggle to disable images**
*   Remove comments, sidebars, ads, share widgets, footers, scripts, and styles
*   Kindle-safe output and headers

**Out**

*   Caching, auth, admin UI, DB
*   Full-text search, series TOC, advanced pagination stitching
*   Image transcoding (nice-to-have future)

## 3) Target Constraints (Kindle/E‑Reader)

*   **No JS** or dynamic features
*   **No CSS**; rely on semantic tags only: `<h1/h2>`, `<p>`, `<ul/ol>`, `<li>`, `<a>`, `<blockquote>`, `<pre><code>`, `<img>`
*   Avoid `<figure>`, `<picture>`, `<source>`, complex HTML5; convert to `<img>` where applicable
*   Prefer **JPEG/PNG/GIF**. **WebP** is not reliably supported on older Kindles; ignore WebP `<source>` entries and select a compatible image source
*   Keep HTML size reasonably small; optional query to drop images for very long posts
*   Use **absolute URLs** for links and images
*   Minimal, valid HTML5 with `<meta charset="utf-8">`
*   Ensure keyboard-only navigation works (no interactivity needed)

## 4) Functional Requirements

### 4.1 Endpoints

*   `GET /render?url=<encoded_acoup_url>[&images=off]`
    *   **Input**: `url` must belong to `https://acoup.blog/…`
    *   **Options**: `images=off` (default `images=on`)
    *   **Output**: `text/html; charset=utf-8`, minimal HTML with **no JS/CSS**
    *   **Errors**:
        *   `400` invalid or non-whitelisted domain
        *   `504/502` fetch timeout/upstream failure
        *   `422` content extract failure

*   `GET /healthz` → `200 OK` plain text

### 4.2 Fetch

*   HTTP GET with a 10s timeout
*   Set a clear `User-Agent` (e.g., `ACoup-Kindle-Renderer/1.0 (+contact)`)

### 4.3 Extraction (WordPress patterns)

*   Identify the main content container (typical: `.entry-content`, `.post`, or `<article>`).
*   Extract: **title**, **published date** (if available), **author** (if available), **content HTML**.
*   Drop: comments, nav bars, footers, sidebars, share buttons, related posts.

### 4.4 Sanitize & Flatten

*   Remove all `<script>`, `<style>`, `<link>`, `<noscript>`, `<iframe>`, `<svg>`, `<form>`, tracking pixels
*   Remove `class`, `id`, `style`, `on*` event attributes from all elements
*   Allow tags: `a, p, h1, h2, h3, h4, ul, ol, li, strong, em, blockquote, pre, code, img, br, hr`
*   Convert unsupported or decorative tags to safe equivalents:
    *   `<figure>/<figcaption>` → `<div>/<p>`
    *   `<picture>/<source>` → pick one `<img src>` pointing to JPEG/PNG/GIF
*   Strip external embeds; convert to plain link to the original

### 4.5 Links & Images

*   Rewrite **relative** URLs to **absolute**
*   Strip tracking params (e.g., `utm_*`)
*   For images:
    *   If `images=off`, remove all `<img>`
    *   Else, select a **non-WebP** source; prefer `.jpg/.jpeg/.png/.gif`
    *   If lazy-loading, move `data-src` → `src`
    *   Preserve `alt` text; if missing, set `alt=""`
*   Do **not** inline base64 images for now (can inflate HTML size)

### 4.6 Output HTML (Kindle-friendly)

Return a minimal HTML document:


**HTTP Headers**

*   `Content-Type: text/html; charset=utf-8`
*   `Content-Security-Policy: default-src 'none'; img-src https: data:; style-src 'none'; script-src 'none'`
*   `X-Robots-Tag: noindex, noarchive`

## 5) Non-Functional Requirements

*   **Security**: domain whitelist (`acoup.blog`); sanitize HTML with an allowlist. Never execute source JS.
*   **Performance**: single fetch per request; process within \~2–4s for large posts; 10s timeout.
*   **Reliability**: graceful HTML error page on failures.
*   **Legal/Ethics**: Provide attribution and **link to original**; set `noindex` to avoid SEO duplication; respect `robots.txt` fetch semantics.

## 6) Implementation Options

### 6.1 Node.js (Preferred Example)

*   **Runtime**: Node 20+
*   **Libraries**:
    *   `express` (HTTP)
    *   `undici` or `node-fetch` (fetch with timeout)
    *   `cheerio` (HTML parsing)
    *   `isomorphic-dompurify` + `jsdom` **or** custom allowlist sanitizer using `cheerio`
    *   `tldts` (domain validation)

**Structure**

    /src
      server.ts
      render.ts         # fetch/extract/sanitize pipeline
      sanitize.ts       # tag/attr allowlist
      kindle.ts         # image & link rewrite helpers
      wp-acoup.ts       # site-specific selectors/heuristics
    /test
      render.spec.ts

### 6.2 C# (.NET)

*   **Runtime**: .NET 8 Minimal API
*   **Libraries**:
    *   `AngleSharp` (HTML parsing)
    *   `Ganss.XSS` (sanitization allowlist)
    *   `Flurl.Http` or `HttpClientFactory` (fetch with timeout)

**Structure**

    /src
      Program.cs
      Pipeline/RenderService.cs
      Pipeline/WordPressExtractor.cs
      Pipeline/Sanitizer.cs
      Pipeline/KindleTransforms.cs
    /tests
      RenderTests.cs

## 7) Acceptance Criteria

1.  `GET /render?url=<valid acoup url>` returns **valid HTML** that loads on a Kindle Paperwhite with **no JS/CSS**.
2.  Page shows **title**, **original link**, **body text**, and **images** (unless `images=off`).
3.  All **links and images are absolute**; no WebP sources used.
4.  Source **scripts/styles/iframes** are not present in output; no inline `style` attributes remain.
5.  Response includes CSP blocking scripts/styles and `X-Robots-Tag: noindex`.
6.  Non-`acoup.blog` URL → `400` with a readable error page.
7.  Timeouts and fetch errors return a readable error page with `5xx`.

## 8) Test URLs (Manual)

*   Single post: `https://acoup.blog/2023/05/12/collections-logistics-of-the-roman-army-part-i/`
*   With images off: `/render?url=<encoded>&images=off`
*   Invalid domain: `/render?url=https://example.com/` → `400`

## 9) Future (Not in v1)

*   Image **transcoding** (WebP → JPEG) and **downscaling**
*   Multi-part post detection and “Next/Prev” nav
*   Pre-render cache, rate limiting, and ePub export

***

### Next step

Pick a language (**Node or C#**) and I’ll generate the initial scaffold (folders, minimal server, and pipeline stubs) so you can `git push` and run. Which do you prefer?
