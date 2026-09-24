# Kae Ops

Personal life-tracker: daily focus, buckets/points, steps, money, and a brain-dump-to-plan AI assistant.

## First-time setup (GitHub + Netlify)

1. Create a new **empty** repo on GitHub (no README/license — this folder already has one), then:
   ```
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick this repo. Build settings are already
   set via `netlify.toml` (publish `.`, functions in `netlify/functions`) — no build command needed.
3. In the new site's **Site configuration → Environment variables**, add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
   (Add it there, never paste it into chat or commit it to the repo.)
4. If you want to keep the same live URL (`kae-ops.netlify.app`), go to **Site configuration → General → Site details → Change site name** on the new site and set it to `kae-ops` (only works if that name is still free — it was your old drag-and-drop site's name, so you may need to delete/rename that one first).

## Day-to-day

Every `git push` to `main` auto-deploys. No more dragging zip files.

## What's what

- `index.html` — the whole app (single file, vanilla JS, no build step)
- `netlify/functions/chat.js` — server-side proxy to Anthropic's API for the "Brain dump → plan" assistant (the `+` button on Today). Keeps your API key off the client.
- Data is stored in the browser's `localStorage` — per-device, not synced across phone/laptop.
