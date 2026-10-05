# JointJS+: Playbook Collaboration (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

The Playbook demo is a real-time, multiplayer process designer built on `@joint/react-plus`: every collaborator takes a department seat on a shared board and maps triggers, steps, approvals and notes together, with live cursors, a frame and name on whatever card a colleague has their hands on, and an activity feed. The board is one zustand store mirrored through [Liveblocks](https://liveblocks.io), and the JointJS graph is a controlled projection of it: cards and flows are derived from the shared document, presence (cursors, drags, resizes, edits, flows in the air) is drawn into the cells themselves, and every gesture on the canvas writes back to the store so all boards stay identical. Without a Liveblocks key the same board runs across the tabs of one browser over `BroadcastChannel`.

This demo is also available online at [jointjs.com](https://jointjs.com/demos/playbook-collaboration).

## What this demo shows

- **A controlled diagram over a shared document** — `<Diagram cells>` receives cell records derived from the zustand store (`src/canvas/derive-cells.ts`), so the graph on every board is the same pure function of the same document. Drags, resizes and connections are reported by the paper's React event props and written to the store, never to the graph; the store change flows back through the controlled sync
- **Presence in the cells** — a colleague's hands on a card (dragging, resizing, editing in place or in the inspector) draw their frame and name tag on it, marching ants while they move or resize, and name the verb on their cursor plate and in the team panel. A flow being dragged out of a port is drawn dashed on every board, a card on its way from the rail shows as a ghost. Nothing is shown for a bare click: presence means hands, not looks
- **Change detection with `useCell`** — a card reads the shared document through a `useCell` selector that keeps the last snapshot of position, size and text and clocks the moment a colleague's change lands, skipping the user's own gestures (`src/canvas/card-change.ts`). The document carries no author stamp
- **Ports with direction** — every process card has an IN dot on the left (target only) and an OUT dot on the right; flows run out to in, `validateConnection` enforces it, the IN dots pulse while a flow is in the air, and a note carries no ports at all
- **react-plus building blocks** — `<PaperScroller>` for the canvas, a headless `<Stencil>` as the card rail with a card-shaped drag ghost, `<FreeTransform>` with the card bounds as its limits for resizing, `useOnKeyboardEvents` for Esc and Delete, `useOnGraphEvents` for the resize echo, `useOnPaperEvents` for the first fit, `<Overlay>` for cursors and ghosts
- **Boards and seats** — a dashboard lists the latest boards, each seats up to eight departments, invite links carry the board and its name, and a returning member gets their seat and name back
- **Accessibility** — the board is a labelled scrollable region and every control is keyboard-operable; Lighthouse accessibility, best practices and SEO at 100

## Why build a collaborative editor with JointJS+ for React

Multiplayer editing is a state problem before it is a drawing problem: who owns the truth, how edits merge, what a colleague sees while you work. `@joint/react-plus` lets the diagram be a projection of application state, so the shared document, not the canvas, is the source of truth, and presence can be rendered into the same cells with ordinary React. The JointJS+ widgets (stencil, free transform, paper scroller) come as React components and hooks, so the interaction layer is declarative too.

## Use cases

- Process and SOP design across departments
- Shared workflow and journey mapping in product and operations teams
- Any diagram editor that needs live cursors, presence and a shared document

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download playbook-collaboration/react
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry. By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token. You can set this environment variable in your terminal or CI environment in the following way:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```

### Going online with Liveblocks

Without a key, boards run locally over `BroadcastChannel`: open the same board in a second tab of the same browser and it is already multiplayer. To sync across browsers and machines:

1. Copy `.env.example` to `.env.local` (gitignored; a key never belongs in the repository).
2. Sign in at [liveblocks.io](https://liveblocks.io), open or create a project, and copy its **public** key from *API keys* (`pk_dev_…` or `pk_prod_…`). Never use the secret key: the public key ends up in the bundle by design and only lets a browser enter that project's rooms.
3. Paste it as `VITE_LIVEBLOCKS_PUBLIC_KEY` and restart `npm run dev`.
4. Open a board and press **Invite** in the top bar for a link that brings colleagues straight onto it.

## Checks

```bash
npm test   # typecheck + lint + unit tests
```

## Related

- [JointJS for React documentation](https://docs.jointjs.com/react)
- [Liveblocks](https://liveblocks.io/docs)
- [Other JointJS demos](https://jointjs.com/demos)
