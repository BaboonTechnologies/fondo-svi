// Servidor de producción: sirve el SPA (dist/) y replica las rutas /api/* que
// en Vercel eran serverless functions. Reutiliza la capa de datos api/_lib/core.mjs
// (sin claves, solo feeds públicos). Sin dependencias externas: Node 20 trae fetch.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getYahooQuote, getLatestYouTube, getLatestSubstack } from './api/_lib/core.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, body, cacheControl) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
  });
  res.end(payload);
}

async function handleApi(pathname, url, res) {
  if (pathname === '/api/yahoo-quote') {
    const symbol = url.searchParams.get('symbol') || '0P0001TB5J.F';
    const { status, body } = await getYahooQuote(symbol);
    return sendJson(res, status, body, 'public, s-maxage=300, stale-while-revalidate=600');
  }
  if (pathname === '/api/media/youtube') {
    const { status, body } = await getLatestYouTube();
    return sendJson(res, status, body, 'public, s-maxage=1800, stale-while-revalidate=3600');
  }
  if (pathname === '/api/media/substack') {
    const { status, body } = await getLatestSubstack();
    return sendJson(res, status, body, 'public, s-maxage=1800, stale-while-revalidate=3600');
  }
  return sendJson(res, 404, { error: 'not found' });
}

async function serveFile(filePath, res) {
  const data = await readFile(filePath);
  const type = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(data);
}

async function serveStatic(pathname, res) {
  // Normaliza y evita path traversal fuera de ROOT.
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(ROOT, safePath);
  if (!candidate.startsWith(ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  try {
    const info = await stat(candidate);
    if (info.isFile()) return await serveFile(candidate, res);
  } catch { /* no existe: caemos al fallback */ }

  // Rutas de cliente (React Router, p. ej. /resultados) -> index.html.
  // Si pedían un asset con extensión y no existe, es un 404 real.
  if (extname(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return;
  }
  return await serveFile(join(ROOT, 'index.html'), res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;
    if (pathname === '/healthz') { res.writeHead(200); res.end('ok'); return; }
    if (pathname.startsWith('/api/')) return await handleApi(pathname, url, res);
    return await serveStatic(pathname, res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'server error' }));
  }
});

server.listen(PORT, () => console.log(`fondo-svi server on :${PORT}`));
