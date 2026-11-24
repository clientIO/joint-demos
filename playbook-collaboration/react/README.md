# JointJS+: Playbook, Real-Time Collaboration (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

Playbook is a JointJS+ demo application for designing business processes together, in real time. It shows how a `@joint/react-plus` diagram and [Liveblocks](https://liveblocks.io) fit together: the room's storage is the one source of truth, the diagram is drawn from it, and presence carries everything live about the people in the room.

## What this demo shows

- **A diagram synced through Liveblocks storage**: a controlled `<Diagram cells>` drawn from storage, with user edits written back through `onIncrementalCellsChange`
- **Live presence**: cursors with department, name and current activity; a colored frame and name tag on the card someone is editing, and marching ants while they drag or resize it
- **Shared drafts**: a flow being drawn and a card being dragged in from the palette show on everyone's board before they land
- **Custom cards as React components**: kind tab, icon chip, department pill and wrapping detail text, plus in-place renaming and resize handles
- **A stencil palette, ports and orthogonal routing**: drag a card kind onto the board, drag from a card's OUT dot to another card's IN dot to connect them
- **A side panel**: an inspector, quick-add buttons, who is online and a shared activity feed
- **Dark and light themes and keyboard support**

## Why build collaborative diagrams with JointJS+ for React

A collaborative editor needs a diagram that can be driven entirely from external state. JointJS+ for React gives you:

- **Controlled cells**: pass `cells` from any store (here, Liveblocks) and get granular change sets back, so syncing is a few lines, not a framework
- **Custom shapes**: cards, ports and links are ordinary React components and records
- **Feature richness out of the box**: stencil, resize handles, paper scroller, keyboard handling and overlays for presence, all included in JointJS+ for React

## Use cases

- Multiplayer process, workflow and journey designers
- Shared whiteboards for operations, sales and support teams
- Any diagram editor where several people edit the same model at once

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

### Liveblocks public key

The board lives in a Liveblocks room, so the app needs a Liveblocks **public** key. Liveblocks has a free plan.

1. Sign in at [liveblocks.io](https://liveblocks.io) and open (or create) a project.
2. Copy its public key (`pk_dev_...` or `pk_prod_...`) from *API keys*. Never use the secret key: the public key ends up in the browser bundle by design and only lets a browser enter that project's rooms.
3. Copy `.env.example` to `.env.local` (gitignored) and set `VITE_LIVEBLOCKS_PUBLIC_KEY`.

Without a key there is no offline mode: the app opens on a short screen that explains these steps.

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```

Each board is a room named by the `?board=` parameter of the URL. Press **Invite** to copy the link, or open the same URL in a second tab (or a private window) to see the collaboration on one machine.

## Related

- [JointJS for React documentation](https://docs.jointjs.com/react)
- [Liveblocks documentation](https://liveblocks.io/docs)
- [Other JointJS demos](https://jointjs.com/demos)
