# SideTracked

**One thing leads to another.**

**Live demo: https://side-tracked.vercel.app**

SideTracked is an interactive way to explore the internet's knowledge. Start with any topic and follow related topics outward through a living map of ideas. The path you take is saved as a trail you can rewind, revisit and keep.

Topics come from [Wikipedia](https://www.wikipedia.org) and [Wikidata](https://www.wikidata.org), shown in SideTracked's own look: pinned notes on tracing paper, joined by a red thread.

## What it does

- **Start anywhere.** The landing page pins five random topics to a board, each with a line on why it is worth following. Reload for a new hand, or press Shuffle.
- **Explore as a graph.** The current topic glows amber at the centre. Related topics fan out around it, found by combining similar articles with ones that link both ways, plus a few surprising tangents. Click one to take a step. Your whole journey stays on the map behind you, fading with age under a faint starfield, and the view glides along with you. "Whole journey" zooms out to see it all.
- **Peek before you step.** Hover a topic to see its thumbnail and first lines. Arrow keys move between topics and `Enter` steps into one. The ones you leave behind drift toward the one you chose.
- **Handle the graph.** Scroll to zoom, drag empty space to pan, double-click it (or press "Reset view") to come home. Pull a topic aside and it springs back while its neighbours sway after it. A soft glow follows your cursor, and rings of light spread out whenever you arrive somewhere.
- **Find your way on a long trail.** After three steps a minimap appears in the corner with a box for what you can see: click or drag it to move around. Pointing at a topic in the reading panel lights it up on the map, and each one says why it was offered.
- **See your whole journey.** Press `M` (or "Map") to see every topic on your trail as a constellation you can pan and zoom. Pick a star to go back to it.
- **Collide two topics.** Pick any two, like Octopus and Byzantine Empire, and SideTracked finds a topic that links them (Octopus, Alexander of Tralles, Byzantine Empire). Well-known stepping stones come first, and if no single topic links them it looks for a chain of two (Octopus, Ocean, New Orleans, Jazz). The answer is drawn as a glowing thread with the other meeting points hanging off it: click one to swap it in, or walk the chain as a trail. The result has its own link, so you can share it.
- **Keep your trail.** Every step is recorded along the bottom. Click an earlier step to rewind, or use the browser's back button. Trails are saved in your browser, and sync across devices if you sign in with Google.
- **Jump anywhere.** Press `Ctrl K` (or `/`) to search any topic, pick "Surprise me" for a random article, or open your saved trails.
- **See what kind of thing it is.** Small icons mark each topic as a person, place, event, idea or thing.
- **Read without leaving.** A side panel shows the summary and links to the full Wikipedia article.
- **Works on phones.** The panel becomes a bottom sheet and the graph reflows to a portrait layout.

## Getting started

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

## Accounts (optional)

SideTracked works without an account: trails are kept in your browser. If you set up Firebase, a "Sign in" button appears and saved trails sync across your devices.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Authentication → Sign-in method:** enable **Google**.
3. **Build → Firestore Database:** create a database, then paste the contents of [`firestore.rules`](firestore.rules) into the **Rules** tab and publish.
4. **Project settings → Your apps:** add a Web app, then copy its config into a new `.env.local` (see [`.env.example`](.env.example)).
5. **Authentication → Settings → Authorized domains:** add your deployed domain (`localhost` is already allowed).

For a hosted site, add the same four `VITE_FIREBASE_*` values as environment variables in your host's settings and redeploy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build for production into `dist/` |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Typecheck the app and the e2e tests |
| `npm test` | Run unit and component tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright, uses Chrome) |

The e2e tests use a fake Wikipedia, so no tests touch the live site. On a machine without Chrome, run `npx playwright install chrome` first.

## Built with

Vite, React 18 and strict TypeScript. React Router for pages, TanStack Query for data, Zustand for saved trails, Firebase (Google sign-in and Firestore) for optional accounts, d3-force and SVG for the graph, and zod to validate every API response. Styling is plain CSS Modules on a small set of design tokens. Tests use Vitest, Testing Library and Playwright.

## Project layout

```
src/
  app/          app shell, router, providers
  routes/       Landing and Explore pages
  features/     graph, reader, trail, search
  api/          Wikipedia and Wikidata clients
  domain/       pure types and logic (ranking, kinds)
  stores/       Zustand stores
  components/   shared UI pieces
  hooks/        shared hooks
  styles/       design tokens and global styles
e2e/            Playwright tests
```

## Data and credit

Article text comes from Wikipedia and is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). SideTracked links every summary back to its source article. Topic types come from Wikidata, whose data is available under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## For contributors

[CLAUDE.md](CLAUDE.md) documents the design direction, conventions, architecture and git workflow in detail, and is the best place to start before making changes.
