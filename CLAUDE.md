# SideTracked

**One thing leads to another.** An interactive exploration app: the user starts with one topic and follows related topics outward through a living knowledge graph. The trail they leave is the product.

Full visual spec: https://claude.ai/artifact/EWLXD5KKVqkhJjKH9dyd7E (approved 2026-10-31).

## Design direction

Concept: *reading by lamplight in a very large library.* Dark, quiet surroundings; warm light marks where you've been and where you are, cool light marks what you could explore next.

- **Must not** look like a Wikipedia clone, a generic dashboard, or a neon UI. Minimal chrome, strong hierarchy.
- **Colour means state, never category.** Categories (person, place, idea, event, thing) are small glyphs.
- **Dark-only** for now. All colours come from tokens in `src/styles/tokens.css`. No hard-coded hex in components.

| Token | Value | Use |
|---|---|---|
| `--void` | `#0B0C10` | Canvas |
| `--deep` | `#12141A` | Panels, cards |
| `--raise` | `#1A1D25` | Hover, inputs |
| `--paper` | `#ECE8E1` | Text (never pure white) |
| `--lantern` | `#F0B35B` | Only: current node, trail, primary CTA |
| `--tide` | `#8E9CFF` | Unexplored nodes, ambient glow, links |

- **Type:** Instrument Serif (display, topic titles, graph labels) · Hanken Grotesk (UI, body) · JetBrains Mono (counters/metadata only).
- **Motion:** ease `cubic-bezier(.22,.8,.24,1)`, 200–600 ms. New nodes bloom from their parent; everything else holds still. Honour `prefers-reduced-motion`.
- **Nodes:** current = solid lantern disc + breathing halo · visited = paper disc + thin warm ring · discoverable = hollow tide ring (fills on hover) · distant = small dashed grey, unlabelled. Edges are always curved; trail edges warm and thicker. Hover dims everything not adjacent.
- **Layouts:** Landing = one centred search, seed topics, recent trails, faint drifting graph behind. Workspace = full-bleed graph, floating glass reading panel (right), trail thread (bottom), chrome fades after 3 s idle.
- **Responsive:** ≥1200 desktop as above · 768–1199 panel becomes 2-height bottom sheet · <768 sheet holds the trail, max 5 neighbours, tap = preview, second tap = step. Touch targets ≥ 44 px. Provide a keyboard/screen-reader list view of the graph.

## Tech stack (approved)

- **Vite + React 18 + TypeScript** (strict), npm.
- **React Router** — routes `/` and `/explore/:topic`. Browser back = step back along the trail.
- **TanStack Query** — all remote data fetching and caching.
- **Zustand** (+ `persist` middleware) — client state; trails saved to `localStorage`. No accounts or backend yet.
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
- Accessibility: semantic elements, visible `:focus-visible` (lantern outline), every interactive SVG node focusable with an `aria-label`.
- No `console.log` in committed code (use a small `logger` that is silent in production).

## API integration (Wikipedia / Wikidata)

- All calls go through `src/api/*`; never `fetch` from components.
- Send `Api-User-Agent: SideTracked/<version> (https://github.com/noeljj77/SideTracked)` and `origin=*` on Action API calls (Wikimedia policy + CORS).
- Endpoints:
  - Summary: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`
  - Search/autocomplete: `https://en.wikipedia.org/w/rest.php/v1/search/title?q=&limit=`
  - Related topics: Action API `list=search&srsearch=morelike:{title}` (namespace 0), ranked by result order in `domain/ranking.ts` into `strong | related | surprising`. (Merging in `prop=links` is a possible later improvement.)
  - Category glyph (`api/wikidata`): one batch per page of topics. Wikipedia `prop=pageprops&ppprop=wikibase_item` maps titles to Wikidata ids (follow `normalized` and `redirects`), then one SPARQL query on `query.wikidata.org` (`?item wdt:P31/wdt:P279* ?class`, `VALUES` of the classes in `domain/kind.ts`) finds each item's kind. Precedence person > event > place > idea, default thing. Don't send `Api-User-Agent` to the SPARQL endpoint (it breaks CORS preflight). Glyphs are optional: if the lookup fails, topics simply show without one.
- Normalise titles (spaces ↔ underscores, redirects) in one helper; the topic id is the canonical page title.
- TanStack Query keys: `['topic', id]`, `['related', id]`, `['search', q]`. `staleTime` ≥ 1 h for summaries. Retry 2× with backoff, not on 4xx.
- Debounce search 200 ms and abort stale requests (`signal`).
- Show attribution ("From Wikipedia, CC BY-SA") with a link to the source article in the reading panel.

## Graph data and state

- Domain types live in `src/domain`: `Topic { id, title, summary, thumbnail?, kind }`, `Link { source, target, strength }`, `Trail { id, name, steps: TopicId[], forks, createdAt, updatedAt }`.
- **Server data (topics, related) belongs to TanStack Query. Client state (trail, current node, UI) belongs to Zustand.** Don't copy query data into stores.
- Graph store holds only ids, positions, and node state (`current | visited | discoverable | distant`); look topics up from the query cache.
- Node state is derived from the trail, not stored twice.
- Cap the visible graph (current + neighbours + one distant ring); prune old nodes but keep them in the trail.
- Persisted state is versioned (`version` + `migrate` in `persist`). Never break existing saved trails without a migration.

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
- E2E (`e2e/`, Playwright) covers: search → open topic → step to neighbour → rewind via trail → reload keeps trail, plus command bar, trails overlay, and error states. It mocks Wikipedia in `e2e/wikipedia.ts` (never the live site), starts its own dev server on port 4173, and drives the installed Chrome (`channel: 'chrome'`); on a machine without Chrome run `npx playwright install chrome`. Add new e2e specs when adding a user-visible flow.
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
