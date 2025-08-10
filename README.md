# ACOUP Reader (Kindle-Friendly Renderer)

Minimal Node.js + TypeScript service to fetch, sanitize, and render Kindle-friendly HTML for posts from https://acoup.blog/.

## Requirements
- Node.js 20+

## Scripts
- `npm run dev` — start in watch mode
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled server
- `npm test` — run unit tests

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000/healthz

Example:
```
http://localhost:3000/render?url=https%3A%2F%2Facoup.blog%2F2023%2F05%2F12%2Fcollections-logistics-of-the-roman-army-part-i%2F
```

## Notes
- No JS/CSS in output, CSP blocks scripts/styles, `X-Robots-Tag: noindex`.
- Domain whitelist: only acoup.blog URLs are accepted.
