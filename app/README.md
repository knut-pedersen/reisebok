# Vår reisebok

Knut and Anna's private travel journal, built from the Claude Design handoff in `../project/Reisebok.dc.html`. It is a responsive PWA meant for installation on Android, with the interface in Norwegian bokmål.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build with service worker
npm run preview    # serve the build (the PWA install and offline shell work here)
```

## Deploy

Every push to `main` builds and publishes the app to GitHub Pages (`.github/workflows/deploy.yml`) at `https://<owner>.github.io/<repo>/`. The build sets `BASE_PATH=/<repo>/` so routes, the manifest and the service worker work from that sub-path, and copies `index.html` to `404.html` so deep links survive a reload. In the repository settings, Pages must use «GitHub Actions» as its source.

## Stack

- Vite, React 19, TypeScript and React Router.
- [zustand](https://github.com/pmndrs/zustand) holds the state in `src/store/store.ts`, with pure view helpers in `src/store/derive.ts`.
- IndexedDB (`idb`) keeps the archive and the original photo files on the phone (`src/lib/db.ts`).
- Leaflet draws the map, with Natural Earth country outlines under the tiles (`src/components/MapView.tsx`).
- `exifr` reads capture time and GPS position from the photos you pick.
- `vite-plugin-pwa` provides the manifest, the service worker and the offline app shell. Fonts are self-hosted with `@fontsource`.

## Map tiles

The tiles are configurable through `.env` (see `.env.example`). The default is CARTO Voyager, which uses OpenStreetMap data and shows the attribution. CARTO's free tier has usage limits, so confirm the terms or switch provider before wider use. The design's Esri street map also works through the same variables, but it needs an Esri API key or agreement.

## Shared archive, login and sync

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set, the app uses a shared archive in Supabase. Setup steps are in [`../docs/supabase-oppsett.md`](../docs/supabase-oppsett.md) and the schema in [`../supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql). Without them the app runs on this phone only, which suits development.

- **Login:** a one-time code by e-mail, for the two addresses in `members` only. Database rules (RLS) limit every read and write to members.
- **Local-first:** everything is written to IndexedDB first. «Lagret på denne telefonen» appears only after the write is confirmed. The app works offline and keeps a list of unsent changes that survives restarts.
- **Sync** (`src/sync/engine.ts`):
  - Each trip, memory, place, dream and upcoming trip is one row with a version number.
  - The phone pulls changes since its last position, uploads photo files (original plus a 1600 px display copy) to a private bucket, then pushes its changed entities with conflict detection.
  - Changes on both phones are merged field by field: comments, ratings, photos, the story and days are combined.
  - When both of you rewrote the same shared text, the other person's version is kept and yours is shown next to it to compare.
  - Live updates come via Supabase Realtime. The phone also syncs on reconnect and when it comes back to the foreground. Uploads continue only while the app is open.
- **Backup:** sync is not a backup. Export → «Komplett arkiv (ZIP)» downloads `data.json`, a readable `reisebok.html` and the original photos.
- **Not built yet:** PDF download.

Tests: `npm test` runs the sync engine against an in-memory server with two simulated phones.

## Structure

```
src/
  App.tsx               shell: nav, header, routes, scroll restore, overlays
  data/                 types and demo seed
  lib/                  formatting, IndexedDB, navigation, page helpers
  store/                state + actions, derived view models
  components/           Map, photo, lightbox, sync panel, «Legg til»
  views/                one file per screen (map, trips, trip book, day, memory, place,
                        dreams, import, new trip/memory, book, settings, export, about)
```

Routes: `/` map, `/reiser`, `/reise/:id?fane=&minne=&vis=`, `/reise/:id/dag/:n`, `/reise/:id/bok`, `/minne/:id`, `/sted/:id`, `/drommer`, `/bilder`, `/ny-reise`, `/nytt-minne`, `/innstillinger`, `/eksport`, `/om`.
