import express, { Request, Response } from 'express';
import { renderRouteHandler } from './render';

const app = express();
const port = process.env.PORT || 3000;

app.get('/healthz', (_req: Request, res: Response) => {
  res.type('text/plain').send('ok');
});

// Default route: go to ACOUP homepage via internal renderer
app.get('/', (_req: Request, res: Response) => {
  const homepage = 'https://acoup.blog/';
  res.redirect(302, `/render?url=${encodeURIComponent(homepage)}`);
});

app.get('/render', renderRouteHandler);

// Fallback 404
app.use((_req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

app.listen(port, () => {
  console.log(`ACOUP Reader listening on http://localhost:${port}`);
});
