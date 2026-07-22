'use strict';

/*
 * oblique.cards server
 *
 * A tiny, zero-dependency Node server. It serves the static site and, for any
 * request that carries ?n=<card>, rewrites the social preview tags (title and
 * canonical URL) so a shared link previews that specific card. It reads the
 * same cards.txt the browser reads, so the deck and the previews can never
 * drift apart. If anything goes wrong it falls back to serving the site as-is.
 *
 * No dependencies on purpose. Nothing to install, almost nothing to break.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const SITE = (process.env.SITE_URL || 'https://oblique.cards').replace(/\/+$/, '');

// index.html is read once at startup (redeploys restart the process).
let INDEX_HTML = '';
try { INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); }
catch (e) { INDEX_HTML = '<!doctype html><meta charset="utf-8"><title>Oblique</title><p>Deck unavailable.</p>'; }

// cards.txt is reloaded whenever its mtime changes, so live edits show up
// without a restart.
let deck = [];
let deckMtime = -1;
function loadDeck() {
  try {
    const p = path.join(ROOT, 'cards.txt');
    const st = fs.statSync(p);
    if (st.mtimeMs !== deckMtime) {
      const text = fs.readFileSync(p, 'utf8');
      deck = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && l[0] !== '#');
      deckMtime = st.mtimeMs;
    }
  } catch (e) { /* keep whatever we had */ }
  return deck;
}
loadDeck();

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function setMeta(html, attr, key, value) {
  const re = new RegExp('(<meta ' + attr + '="' + key + '" content=")[^"]*(")');
  return html.replace(re, '$1' + value + '$2');
}
function setTitleTag(html, value) {
  return html.replace(/<title>[^<]*<\/title>/, '<title>' + value + '</title>');
}
function setLink(html, rel, value) {
  const re = new RegExp('(<link rel="' + rel + '" href=")[^"]*(")');
  return html.replace(re, '$1' + value + '$2');
}

// Build the document, injecting per-card preview tags when n is valid.
function renderDocument(nParam) {
  const cards = loadDeck();
  const n = parseInt(nParam, 10);
  if (!Number.isInteger(n) || n < 1 || n > cards.length) return INDEX_HTML;

  const card = esc(cards[n - 1]);
  const url = SITE + '/?n=' + n;
  let html = INDEX_HTML;
  html = setTitleTag(html, card);
  html = setMeta(html, 'property', 'og:title', card);
  html = setMeta(html, 'name', 'twitter:title', card);
  html = setMeta(html, 'property', 'og:url', url);
  html = setLink(html, 'canonical', url);
  return html;
}

const STATIC = {
  '/cards.txt': { type: 'text/plain; charset=utf-8', cache: 'no-cache' },
  '/og.png':    { type: 'image/png', cache: 'public, max-age=86400' },
  '/robots.txt':{ type: 'text/plain; charset=utf-8', cache: 'public, max-age=86400' }
};

function baseHeaders(extra) {
  return Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN'
  }, extra || {});
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, baseHeaders({ 'Allow': 'GET, HEAD' }));
    return res.end();
  }

  let pathname = '/';
  let query = '';
  try {
    const u = new URL(req.url, SITE);
    pathname = u.pathname;
    query = u.searchParams.get('n') || '';
  } catch (e) { /* default to root */ }

  const send = (code, headers, body) => {
    res.writeHead(code, baseHeaders(headers));
    if (method === 'HEAD') return res.end();
    res.end(body);
  };

  // www is not canonical: 301 to the bare domain, preserving path and query.
  // SITE is the destination everything (og tags, canonical link, share URLs)
  // already points at.
  const host = (req.headers.host || '').toLowerCase();
  if (/^www\./.test(host)) {
    return send(301, { 'Location': SITE + (req.url || '/'), 'Cache-Control': 'no-store' });
  }

  // Health check for Coolify
  if (pathname === '/healthz') {
    return send(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'ok');
  }

  // Favicon is an inline data URI in the HTML; answer the browser's probe quietly.
  if (pathname === '/favicon.ico') {
    return send(204, { 'Cache-Control': 'public, max-age=86400' });
  }

  // The app document
  if (pathname === '/' || pathname === '/index.html') {
    const body = renderDocument(query);
    return send(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }, body);
  }

  // Whitelisted static files
  if (Object.prototype.hasOwnProperty.call(STATIC, pathname)) {
    const meta = STATIC[pathname];
    try {
      const body = fs.readFileSync(path.join(ROOT, pathname.slice(1)));
      return send(200, { 'Content-Type': meta.type, 'Cache-Control': meta.cache }, body);
    } catch (e) {
      return send(404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    }
  }

  // Anything else
  return send(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'Not found');
});

server.listen(PORT, () => {
  console.log('oblique.cards listening on :' + PORT + ' with ' + deck.length + ' cards, site ' + SITE);
});
