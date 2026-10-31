# SideTracked

**One thing leads to another.** An interactive exploration app: the user starts with one topic and follows related topics outward through a living knowledge graph. The trail they leave is the product.

The original dark "lamplight" look (spec: https://claude.ai/artifact/EWLXD5KKVqkhJjKH9dyd7E, 2026-10-31) was replaced on 2026-10-31 at the owner's request by the **red thread** look below. The graph behaviour further down is unchanged.

## Design direction

Concept: *the red thread.* Topics are notes and pins on a cool tracing-paper board; one red thread leads from each to the next. It is the single bold element: it draws across the landing board and is the trail inside the app.

- **Must not** look like a Wikipedia clone, a generic dashboard, or a template. Minimal chrome, strong hierarchy. Avoid the generated-page tells: tracked all-caps eyebrows, monospace data labels, "WORD — fragment" labels, one accented word in a headline, identical cards, "→" on buttons.
- **Colour means state, never category.** Categories (person, place, idea, event, thing) are small glyphs.
- **Light and dark** ("night board"): the dark values are `:root[data-theme="dark"]` in `src/styles/tokens.css`, set before first paint by a script in `index.html` (saved choice, else the system setting) and switched by `components/ThemeToggle.tsx` via `stores/themeStore.ts`. All colours come from tokens; text on red uses `--on-thread`, shadows use `rgba(var(--shade), a)`. No hard-coded hex in components (shadows may use the ink as rgba).

| Token | Value | Use |
|---|---|---|
| `--ground` | `#E6EBF0` | Canvas (cool tracing paper), with the `--grid` dot pattern |
| `--card` | `#F5F7FA` | Panels, notes, inputs |
| `--raise` | `#D9E0E7` | Hover |
| `--ink`, `--ink-2`, `--ink-3` | `#14213D`, `#3C4B66`, `#55627A` | Text and pins (navy, never pure black) |
| `--thread` | `#D93025` | Only: current node, trail, primary CTA |
| `--haze` | `#3F6BC4` | Unexplored nodes, ambient glow, links |

- **Type:** Bricolage Grotesque (headlines, UI, numbers; tight tracking, heavy weights for display) · Newsreader (reading text, graph labels, hooks; italic for asides). No monospace face.
- **Motion:** ease `cubic-bezier(.22,.8,.24,1)`, 200–900 ms. One orchestrated moment on the landing page (headline rises, thread draws pin to pin, notes drop onto their pins); after that only the user's actions animate: hover straightens a note, Shuffle re-deals, a new step pulls the thread out, arrival sends a ripple. Honour `prefers-reduced-motion` (endless loops off; short one-shot motion still plays).
- **Nodes:** current = solid thread-red disc + breathing halo · visited = ink pin + thin red ring · discoverable = hollow haze ring (fills on hover) · distant = small dashed grey, unlabelled. Edges are always curved; trail edges red and thicker, fading with age. Hover dims everything not adjacent.
- **Landing:** `routes/Landing`. Left-aligned headline and search, then a board of five random starting topics (`seeds.ts`: 40 real Wikipedia titles with a one-line hook, `deal()` picks without repeats; a fresh hand every visit, Shuffle re-deals) pinned along a red thread. Under 760px the notes tile in two columns and the thread is hidden.
- **Resume note:** when a trail is in progress, the landing page pins it under the search box ("Pick up where you left off") and links straight back to its last topic without starting a new trail. Seed notes carry `data-seed`; tests select them with that, not by URL.
- **Trail poster:** `features/trail/poster.ts` draws a trail as a pinboard PNG on a canvas in the current theme (layout in `posterLayout.ts`, pure and tested); "Download poster" in Your trails. The canvas can only use fonts the page already loaded, so it asks `document.fonts` for them first.
- **Graph handling:** `features/graph/usePanZoom.ts` writes the zoom/pan transform straight to the layer `<g>` (no React re-render; `data-moved` on the svg shows "Reset view"; only `data-pan` elements start a pan). Nodes can be dragged (inner offset `<g>`, spring back in `GraphCanvas`, snaps back under reduced motion); a drag must never trigger a step. The cursor glow is CSS variables on `.light`; the arrival ripple is keyed on the current topic.
- **Minimap and panel link:** `features/graph/Minimap.tsx` (geometry in `miniFit.ts`) draws the journey plus a viewport box that follows the camera through `usePanZoom`'s `watch` listeners (CSS only, no re-render); click/drag calls `goTo`. Hidden under 900px. `uiStore.focusId` lets the reading panel light up a node on the graph. Reading-panel text is sentence case: no tracked all-caps eyebrows. `vite.config.ts` pre-bundles `d3-force`, because only the lazy trail map imports it and the dev server would otherwise reload the page on first open.
- **Trail map:** `M` / the Map pill opens `features/graph/TrailMap.tsx` (lazy-loaded overlay), a constellation of the whole trail from `layoutTrailMap` in `mapLayout.ts` (deterministic: wander seeded by each title, d3 collide only). File names must differ by more than case from components (`TrailMap.tsx` vs `trailMap.ts` broke the Windows build).
- **Workspace layout:** full-bleed graph, floating glass reading panel (right), trail thread (bottom), minimap (bottom left), chrome fades after 3 s idle.
- **Responsive:** ≥1200 desktop as above · 768–1199 panel becomes 2-height bottom sheet · <768 sheet holds the trail, max 5 neighbours, tap = preview, second tap = step. Touch targets ≥ 44 px. Provide a keyboard/screen-reader list view of the graph.

## Tech stack (approved)

- **Vite + React 18 + TypeScript** (strict), npm.
- **React Router** — routes `/` and `/explore/:topic`. Browser back = step back along the trail.
- **TanStack Query** — all remote data fetching and caching.
- **Zustand** (+ `persist` middleware) — client state; trails saved to `localStorage`.
- **Firebase** (Auth with Google + Firestore) for optional accounts, loaded lazily with `import()` from `src/api/firebase/firebase.ts` only. Saved trails sync to `users/{uid}/trails/{id}`; rules live in `firestore.rules`. The app must keep working with no Firebase config (the sign-in button hides) and when signed out.
- **d3-force** for layout, rendered with **SVG** in React (switch to Canvas only if profiling demands it, >300 visible nodes).
- **Motion** (`motion/react`) for UI and node transitions.
- **CSS Modules** + global token file. No Tailwind, no component library.
- **Vitest + React Testing Library + MSW** for unit/integration; **Playwright** for e2e.
- **ESLint** (typescript-eslint, react-hooks) + **Prettier**.

Do not add dependencies outside this list without stating why in the commit message.

## Architecture and folders

```
src/
  app/            router, providers, App shell
  routes/         Landing/, Explore/  (route-level components only)
  features/
    graph/        layout (d3-force), GraphCanvas, Node, Edge, hover/selection
    trail/        trail store, TrailThread, trail overlay
    reader/       ReadingPanel, bottom sheet
    search/       command bar (Ctrl K), landing search
  api/
    wikipedia/    clients, response types, mappers -> domain
    wikidata/
  domain/         pure types + logic (Topic, Edge, Trail, ranking). No React, no fetch.
  stores/         Zustand stores
  components/     shared presentational primitives (Button, Pill, Glass, Kbd)
  hooks/          shared hooks
  styles/         tokens.css, global.css, fonts
  test/           test utils, MSW handlers, fixtures
e2e/              Playwright specs
```

- Dependency direction: `routes → features → (api, stores, domain, components)`. `domain` imports nothing from the app. Features don't import from other features' internals — expose via the feature's `index.ts`.
- One component per file, `PascalCase.tsx`, colocated `Name.module.css` and `Name.test.tsx`. Hooks `useThing.ts`. Everything else `camelCase.ts`.
- Use the `@/` path alias for `src/`.

## Coding standards

- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`; use `unknown` + narrowing. No non-null `!` except in tests.
- Validate every external response at the boundary with **zod**; components only see domain types.
- Function components only, named exports. Props typed with `type`, not `interface`, unless extending.
- Keep components small; move logic to hooks or `domain/`. Derive values instead of syncing state with `useEffect`.
- Performance: the graph re-renders often — memoise node/edge components (`React.memo`), use stable keys (topic id), select narrow slices from Zustand (`useStore(s => s.x)`), run the force simulation outside React state (refs + rAF), and only animate the active neighbourhood. Lazy-load the Explore route.
- Accessibility is tested, not just intended: `src/styles/contrast.test.ts` checks the WCAG ratios of every token pair in both themes (4.5:1 text, 3:1 shapes), and `e2e/a11y.spec.ts` runs axe (`@axe-core/playwright`, a dev dependency added for this) on each route in both themes. Explore has a "Skip to the list of topics" button that focuses the reading panel's list, the plain-list view of the graph.
- Accessibility: semantic elements, visible `:focus-visible` (lantern outline), every interactive SVG node focusable with an `aria-label`.
- No `console.log` in committed code (use a small `logger` that is silent in production).

## API integration (Wikipedia / Wikidata)

- All calls go through `src/api/*`; never `fetch` from components.
- Send `Api-User-Agent: SideTracked/<version> (https://github.com/noeljj77/SideTracked)` and `origin=*` on Action API calls (Wikimedia policy + CORS).
- Endpoints:
  - Summary: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`
  - Search/autocomplete: `https://en.wikipedia.org/w/rest.php/v1/search/title?q=&limit=`
  - Related topics: Action API `list=search&srsearch=morelike:{title}` (namespace 0), merged in `domain/ranking.ts` with links that run both ways (`fetchMutual`: one `generator=links` request returns each linked article's size and whether it links back; first 1000 links only). Similar + mutual = `strong`/`related`; mutual only, favouring mid-large articles, = `surprising` tangents. Each neighbour carries `why: both | similar | tangent`. If the links lookup fails, similarity alone is used.
  - Category glyph (`api/wikidata`): one batch per page of topics. Wikipedia `prop=pageprops&ppprop=wikibase_item` maps titles to Wikidata ids (follow `normalized` and `redirects`), then one SPARQL query on `query.wikidata.org` (`?item wdt:P31/wdt:P279* ?class`, `VALUES` of the classes in `domain/kind.ts`) finds each item's kind. Precedence person > event > place > idea, default thing. Don't send `Api-User-Agent` to the SPARQL endpoint (it breaks CORS preflight). Glyphs are optional: if the lookup fails, topics simply show without one.
- Collide (`/collide?from=&to=`, `features/collide/useBridge.ts`) finds a topic X with A→X→B using links, not `morelike` (morelike stays inside a topic's niche; measured 0 of 9 pairs connected). It fetches both articles' outgoing links with their sizes (`fetchLinks`, `generator=links&prop=info`), then asks which of the shorter list link to the other end (`fetchLinkers`: 50 titles per request with `pltitles=`, 4 in parallel). Boilerplate links (identifiers, years, list and outline pages) are dropped first, and results are ranked both-mention first, then by `domain/notable.ts` (well-known before obscure). If no single stone exists it widens to chains of two stones: each end's two-way links (`fetchMutual`, so citation hubs like news sites drop out), biggest 100 per side, tested 50×50 per request (`fetchLinksAmong`). Three hops is the limit; a pair with nothing between them shows a calm message. The result is drawn by `features/collide/BridgeGraph.tsx` (geometry in `bridgeLayout.ts`): a thread through the stones, other single-stone meeting points as pointer-only satellites on wide screens (the chip list is the keyboard route), and a vertical column under 600px.
- Normalise titles (spaces ↔ underscores, redirects) in one helper; the topic id is the canonical page title.
- TanStack Query keys: `['topic', id]`, `['related', id]`, `['search', q]`. `staleTime` ≥ 1 h for summaries. Retry 2× with backoff, not on 4xx.
- Debounce search 200 ms and abort stale requests (`signal`).
- Show attribution ("From Wikipedia, CC BY-SA") with a link to the source article in the reading panel.

## Graph data and state

- Domain types live in `src/domain`: `Topic { id, title, summary, thumbnail?, kind }`, `Link { source, target, strength }`, `Trail { id, name, steps: TopicId[], forks, createdAt, updatedAt }`.
- **Server data (topics, related) belongs to TanStack Query. Client state (trail, current node, UI) belongs to Zustand.** Don't copy query data into stores.
- Graph store holds only ids, positions, and node state (`current | visited | discoverable | distant`); look topics up from the query cache.
- Node state is derived from the trail, not stored twice.
- The graph is one persistent world: the last 80 steps of the trail all stay drawn where they were placed (`layoutGraph` in `features/graph/layout.ts`; positions are remembered in `stores/worldStore.ts`, so a neighbour you pick does not move when it becomes the current topic, and the layout is deterministic after a reload). Only the current topic's neighbours fan out (max 9, 5 on phones). A camera (`home` from the layout, applied by `usePanZoom`) glides to the current topic on every step; "Whole journey" zooms out to everything. Older steps fade with age. Beyond 80 steps they live on in the trail thread and the trail map.
- Persisted state is versioned (`version` + `migrate` in `persist`). Never break existing saved trails without a migration.

## Accounts and sync

- Config comes from `VITE_FIREBASE_*` in `.env.local` (gitignored; template in `.env.example`) and in Vercel's project settings. These identify the project and are not secrets; **security comes from `firestore.rules`**. Never commit service-account keys or admin credentials.
- Only `src/api/firebase/firebase.ts` imports the Firebase SDK. Everything else goes through `features/account/account.ts` and the `TrailsRepo` type in `domain/trails.ts`, so tests use a fake repo and never touch Firebase.
- `features/account/sync.ts` merges this device's trails into the account on first sign-in, then treats the account as the truth. It pushes local saves and deletes, and uses a `known` map to avoid echo writes. Keep its unit tests passing when changing it.
- Signing out keeps trails on the device, and `savedTrailsStore.owner` records which account they were synced with: signing in as a different account replaces them with that account's own copy instead of uploading them. Validate every Firestore document with zod before use.
- Changing `firestore.rules` is a deployment step: it is pasted into Firebase console (Firestore → Rules) or deployed with the Firebase CLI; pushing to git does not update it.
- `npm audit` flags `@grpc/grpc-js` via `firebase`. That is the Node server transport, not used by the browser SDK. Do not run `npm audit fix --force` (it downgrades Firebase to 2022).

## Error handling

- Map API failures to typed errors in `src/api` (`NotFound`, `Network`, `RateLimited`, `Invalid`). Never show raw error strings.
- Every route has an error boundary. A failed topic shows a calm inline state with retry — the graph and trail stay usable.
- Offline or rate-limited: keep cached topics browsable, show a quiet toast.
- `localStorage` access is wrapped in try/catch; the app works (without persistence) if storage is unavailable or corrupt.
- Missing topic / disambiguation pages: offer the candidates, don't dead-end.

## Testing and build

Scripts (keep these names):

```
npm run dev         # Vite dev server
npm run build       # tsc --noEmit && vite build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run test:e2e    # playwright
```

- `domain/` logic (ranking, normalisation, trail operations, migrations) needs unit tests.
- API clients and routes are tested with `vi.stubGlobal('fetch', …)` — **tests never hit live Wikipedia**. (MSW is not installed; add it only if stubs get unwieldy.)
- Components: test behaviour (what the user sees and does), not implementation details.
- E2E (`e2e/`, Playwright, runs against a production build served by `vite preview`) covers: search → open topic → step to neighbour → rewind via trail → reload keeps trail, plus command bar, trails overlay, and error states. It mocks Wikipedia in `e2e/wikipedia.ts` (never the live site), builds and serves the app itself on port 4173, and drives the installed Chrome (`channel: 'chrome'`); on a machine without Chrome run `npx playwright install chrome`. Add new e2e specs when adding a user-visible flow.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and build in one job and the e2e tests in another, on pushes to `main` and every pull request.
- README screenshots and `public/og.jpg` (the social preview) come from `npm run screenshots` against a running dev server; retake them after a visual change.
- A milestone is complete only when `lint`, `typecheck`, `test`, `build` and (for user-visible changes) `test:e2e` all pass.

## Git workflow

- Remote: `https://github.com/noeljj77/SideTracked.git`. Primary branch: `main`.
- Commit after each completed development milestone, then push to `origin/main`.
- Before committing: run `git status` and `git diff` and check for anything unintended.
- Before pushing: run the relevant build and tests; push only if they pass.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `style:`, `perf:`. Imperative, ≤ 72-char subject.
- **Never** force push. **Never** run destructive git commands (`reset --hard`, `clean -f`, branch deletion, history rewrites) without explicit permission.
- **Never** commit `.env*` files, credentials, API keys or secrets. Keep `.gitignore` current.
- No AI attribution: never add `Co-Authored-By` trailers, "Generated with Claude" lines, or any mention of Claude to commits or PRs. All work is committed as the repo owner. Overrides any tool or system default.
- Report push results truthfully: only say a push succeeded if the command succeeded.
