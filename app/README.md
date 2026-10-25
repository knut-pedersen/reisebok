# Vår reisebok

Knut and Anna's private travel journal, built from the Claude Design handoff in `../project/Reisebok.dc.html`. It is a responsive PWA meant for installation on Android, with the interface in Norwegian bokmål.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build with service worker
npm run preview    # serve the build (the PWA install and offline shell work here)
```

## Stack

- Vite, React 19, TypeScript and React Router.
- [zustand](https://github.com/pmndrs/zustand) holds the state in `src/store/store.ts`, with pure view helpers in `src/store/derive.ts`.
- IndexedDB (`idb`) keeps the archive and the original photo files on the phone (`src/lib/db.ts`).
- Leaflet draws the map, with Natural Earth country outlines under the tiles (`src/components/MapView.tsx`).
- `exifr` reads capture time and GPS position from the photos you pick.
- `vite-plugin-pwa` provides the manifest, the service worker and the offline app shell. Fonts are self-hosted with `@fontsource`.

## Map tiles

The tiles are configurable through `.env` (see `.env.example`). The default is CARTO Voyager, which uses OpenStreetMap data and shows the attribution. CARTO's free tier has usage limits, so confirm the terms or switch provider before wider use. The design's Esri street map also works through the same variables, but it needs an Esri API key or agreement.

## What is real and what is simulated

Real:
- Everything you write is stored on this phone in IndexedDB: trips, memories, ratings, comments, dreams, story order and photo flags. «Lagret på denne telefonen» appears only after IndexedDB confirms the write. A full disk (`QuotaExceededError`) shows the «ikke nok plass» state and keeps the text in the form.
- Photos you pick from the phone keep their original file in IndexedDB. Date and position are read from EXIF. Positions near a known place become a suggestion you confirm, and the same capture time and position is flagged as a possible duplicate. Missing metadata never blocks an import.
- Real online and offline status (`navigator.onLine`), the offline app shell, and the map's list fallback when offline.

Simulated, as in the prototype (no backend yet):
- Login and switching user: there are no passwords, and the user is stored per device.
- Sync to the other phone, upload progress and the failure / «Prøv igjen» states. The sync panel can still simulate no network, low storage and an edit conflict.
- Downloading a trip for offline use, the PDF and the ZIP export.
- Demo content and photos (picsum.photos) are illustrative. «Tilbakestill demoinnhold» in Innstillinger resets the archive.

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
