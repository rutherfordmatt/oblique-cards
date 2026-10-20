# oblique.cards

A card for when you're stuck. A small, self-contained site with a tiny Node server that
gives every shared card its own social preview.

## Files

- `index.html` — the app. Fetches the deck from `cards.txt` at load, with an embedded
  fallback so it never looks broken.
- `cards.txt` — the deck, one card per line. This is the only file you edit to change cards.
- `og.png` — the social preview image (1200x630).
- `kit/brand-tokens.css` — shared brand tokens (`--mr-*`), copied verbatim from the brand kit.
- `favicon.*`, `apple-touch-icon.png`, `icon-*.png` — favicons from the brand kit.
- `server.js` — zero-dependency Node server. Serves the files and rewrites the preview
  tags per card for `/?n=` links.
- `package.json` — for the Nixpacks build path (`npm start`).
- `Dockerfile` — for the Dockerfile build path (recommended, pinned).
- `robots.txt`, `.dockerignore` — housekeeping.

## Editing the deck

Open `cards.txt`, add or delete lines, commit, and redeploy. Blank lines and lines starting
with `#` are ignored, so group and annotate freely.

Shared links point at a card's position (`oblique.cards/?n=7`). Append new cards at the end
so existing links keep pointing at the same card. Reordering or deleting an earlier line
shifts every link after it.

The running server reloads `cards.txt` when its timestamp changes, so a redeploy always
picks up your edits, and even a live edit on the server is reflected without a restart.

## Deploying on Coolify

This now runs a server, so it is no longer the Static build pack. Two paths, pick one.

**Dockerfile (recommended, most predictable):**
1. New Resource from your Git repo, branch `main`.
2. Build Pack: Dockerfile. Coolify uses the provided `Dockerfile`.
3. The container listens on `3000` and `EXPOSE`s it. Set the exposed port to `3000` if asked.
4. Set the domain to `https://oblique.cards`.
5. Health check path: `/healthz`.
6. Deploy.

**Nixpacks (zero config):**
1. New Resource from your Git repo, branch `main`.
2. Build Pack: Nixpacks. It detects Node from `package.json` and runs `npm start`.
3. Port `3000`, domain `https://oblique.cards`, health check `/healthz`.
4. Deploy.

**DNS and SSL:** point an `A` record for `oblique.cards` at the Hetzner server IP, ports 80
and 443 open. Coolify requests a Let's Encrypt certificate automatically once DNS resolves.
If the domain sits behind Cloudflare's proxy, set the record to DNS-only for the first
certificate issue, or use a Cloudflare origin certificate.

**Auto-deploy:** connect via the GitHub App so a push to `main` redeploys. Then growing the
deck is edit `cards.txt`, commit, push.

## Environment variables

- `PORT` — the port to listen on. Coolify sets this; defaults to `3000`.
- `SITE_URL` — the canonical origin used in preview tags. Defaults to `https://oblique.cards`.
  Set it only if you serve from a different domain.

## Checking previews

After deploy, paste `https://oblique.cards/?n=7` into a link preview debugger (for example
the ones from X, LinkedIn, or Facebook). The title should be that card's text, with the
branded image. `https://oblique.cards/healthz` should return `ok`.

## Analytics

Cookieless and off by default. Open `index.html`, find the analytics comment in the head,
and uncomment one line for self-hosted Plausible, self-hosted Umami, or Cloudflare Web
Analytics. Fill in your host or token and redeploy.

## Later

- Per-card preview images: right now every card shares the branded `og.png` with the card's
  text as the headline. If you want the card text rendered onto the image itself, that is a
  small addition to `server.js` using an image library, with the static image as fallback.
- Categories or tags: when the deck grows into the thousands and you want filtering, the
  single `cards.txt` can become a tagged format or several files without an app rewrite.
