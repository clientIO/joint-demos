# JointJS+: Shikaku (React)

Shikaku ("divide into squares") is a Nikoli pencil puzzle. The board is a grid
with numbers scattered through it; the solution cuts the whole grid into
rectangles, one number per rectangle, each rectangle as many squares in area as
its number says.

This is the puzzle as a `@joint/react-plus` application. The board is a graph —
one element per square — and the numbers, the coloring and the rules live in
React. Pick a size and a difficulty and the generator cuts you a fresh board.

![A partly solved 10x10 board, with a rectangle being dragged out](../screenshot.png)

## Playing

- **Draw a rectangle**: press on a square and drag. The rectangle grows with the
  pointer, in the color it will keep, and the count of squares under it is
  drawn large in the corner of the canvas — the game is hitting an exact number,
  and counting by eye is the tedious part. A rectangle that cannot be placed
  previews in dashed red, and a pill says why. A single number of `1` is placed
  with a plain click.
- **Remove a rectangle**: right-click anywhere inside it.
- **Undo / redo**: `Ctrl`/`⌘` + `Z` and `Ctrl`/`⌘` + `Shift` + `Z`, or the
  toolbar buttons. A new move drops whatever was undone.
- **Escape** abandons the rectangle being dragged.
- The **help** button in the toolbar opens the rules and the controls, and the
  one next to it switches between the light and dark themes.
- Placement is strict, so the board can never hold a wrong rectangle: a
  rectangle commits only when it contains exactly one number, has that number's
  area, and does not run into a rectangle already on the board. The puzzle is
  solved when every square is covered.
- The clock, the progress and the board's seed are in the bottom-left corner of
  the canvas. The clock starts with the board and stops when you finish; the
  seed reproduces the board exactly.
- Filling the last square raises a toast in the corner, with the time the board
  took. The board does not move for it.

## Running the application

This demo depends on JointJS+, which is published to a private npm registry. To
install it you need an access token — from a JointJS+ license or a
[free trial](https://www.jointjs.com/free-trial). Trial users receive the token
during sign-up; customers can find it in the customer portal at
https://my.jointjs.com.

`.npmrc` points `@joint` at the registry and reads the token from the
`JOINTJS_NPM_TOKEN` environment variable, so set that before installing:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Then install and start the dev server:

```bash
npm install
npm run dev
```

Learn more about the [private npm registry here](https://docs.jointjs.com/learn/help-center/npm-registry).

The puzzle logic is plain TypeScript and comes with unit tests:

```bash
npm test          # typecheck, lint, unit tests
npm run test:unit # just the tests
```

## Opening a particular board

A board is a pure function of its size, difficulty and seed, so naming those
reproduces one exactly — handy for a bug report, and the reason an end-to-end
test does not have to guess what is on screen. Either a query string or the
environment can name one (`src/board-request.ts`):

```sh
# For the whole session:
VITE_SEED=1234 VITE_WIDTH=12 VITE_HEIGHT=8 VITE_DIFFICULTY=hard npm run dev

# Per page load:
open 'http://localhost:5173/?seed=1234&width=12&height=8&difficulty=hard'
```

The query string wins over the environment, and anything left unnamed falls back
to the default 10x10 medium board — so `?seed=1234` on its own is enough. Sizes
are held to the same 5-25 limits as the toolbar's inputs, and unusable values
are ignored rather than argued with.

`clock=off` (or `no`, `false`, `0`, or `VITE_CLOCK=off`) stops the timer before
it starts. Naming a board makes everything on screen reproducible except the
clock, which would tick on regardless, so this is what makes two screenshots of
the demo comparable. It is a switch for the tooling, not a feature of the game —
the repository's screenshot comparison uses it, through the `query` field in
`demos.config.json`:

```json
"shikaku": { "variant": "react", "query": "?seed=1234&clock=off" }
```

One wrinkle worth knowing: the seed you ask for is where the generator *starts*.
If that board turns out to have more than one solution it moves to the next seed
and keeps going (see below), so the seed reported in the corner can be a little
higher than the one you passed. It is stable either way — the same request
always lands on the same board — and passing back the reported seed lands on it
directly.

## What this demo shows

### Drawing with a region, started mid-press

The board's squares are inert — `<Paper interactive={false}>` — so a press on
one is free to mean "start drawing here". `useRegion().startRectangleRegion()`
does the drawing, and it is started from inside the `element:pointerdown`
handler (`src/canvas/use-draw-region.ts`) rather than from a button.

That works because the region binds `pointermove` / `pointerup` on the
*document*, not on the paper: it picks up a press that has already happened
instead of waiting for a second gesture. Two details follow from starting it
that way:

- The band's first sampled point is the first `pointermove`, not the press, so
  the rectangle it resolves is unioned with the pressed square's box. That pins
  the anchor exactly, however far the pointer travels before the first move
  arrives.
- A press with no move at all resolves the same way a canceled drag does —
  `null`. The handler tells them apart by whether `onChange` ever fired, which
  is what lets a plain click place a `1`.

### The selection is live

`onChange` fires on every pointer move. It snaps the band to whole squares, runs
the placement rules, resolves the color the rectangle would be given, and moves
the preview element to match — so what the player sees during the drag is
exactly what commits, and committing only turns the fill opaque. An illegal
rectangle previews red with a dashed outline and is dropped on release.

The preview is translucent on purpose: the numbers it covers are the ones the
player is still reading, and they have to stay legible while the rectangle is
being sized. What it does carry is its own size, on a chip drawn in the middle
of it — the count belongs where the player is already looking, not in a corner
of the window. A rectangle too narrow for `4 × 3 = 12` shows just the area,
which is the number being matched anyway.

The library's own rubber band is hidden (`index.css`), through the stylesheet's
`--jj-selection-region-*` variables rather than the region's `color` option:
`@joint/react-plus` styles `.jj-selection-region` in CSS, which beats the `fill`
and `stroke` attributes the option sets.

### Two kinds of element

The graph holds squares and rectangles, told apart by `data.kind`
(`src/canvas/cells.ts`).

A **square** is seeded once per board through `initialCells` and never touched
again. A **rectangle** is added when the player places one, removed when they
take it away, and drawn above the squares — inset by half a gap, so two
rectangles that meet on a grid line are drawn a gap apart rather than sharing an
edge, with rounded corners of their own. It is opaque and carries its own
number, so it hides the squares underneath outright, which is what makes it read
as one shape rather than as the squares it was drawn over.

That is why a rectangle is an element and not paint on the squares it covers:
the corners and the gap belong to the shape, and a shape assembled out of
squares has neither.

There is no second copy of the board in React state: the elements *are* the
rectangles, and everything the game needs — the rectangle in grid units, the
clue it claims, its palette index — travels on the cell. `useGame` reads them
back with a `useCells` selector. That is what makes undo and redo the library's
(below), and it is why the element id is derived from where a rectangle sits
(`r:3:4`) rather than from a counter: placed rectangles never overlap, so the
top-left square names the rectangle, and the id survives being undone and
redone.

The one thing still synced by hand is the rectangle being *dragged*
(`src/canvas/use-pending-cell.ts`), which is React state until it commits.

Both kinds are drawn as plain SVG rather than through `HTMLHost`: a 25×25 board
is 625 squares plus a card per rectangle, and neither is more than a rounded
rectangle with a number in it.

### No scroller — the board fits the window

There is nothing to scroll: the board is the whole content, and a puzzle you
have to pan around is a worse puzzle. So there is no `<PaperScroller>` — and no
hand-written fit either. `usePaper()` gives the paper instance and
`paper.transformToFitContent()` does the job: it scales the content to the
paper's box, centers it, and honors a padding and a maximum scale
(`src/canvas/use-fit-to-content.ts`). Small boards are scaled up rather than
left adrift in the middle of a wide window.

What the paper cannot know is *when*. It fills its container through CSS, so a
window resize changes the room available without it hearing about anything; a
`ResizeObserver` turns that into a refit. The measured size is only the trigger
— the fit is left to the paper's own `getComputedSize()`, which already tracks
the element. Passing the measured box as `fittingBBox` is the trap: that option
defaults to the paper's *current translate* plus its computed size, so a box at
the origin fights the transform already applied and every refit after the first
lands off-center.

The fit depends on the window and the board, and on nothing else. Everything
drawn over the canvas — the count, the reject pill, the solved toast — is either
placed where a centered board leaves room or accepts overlapping it, because a
fit that reacted to them would move the board while the player was looking at
it. Rescaling the moment the last square is filled is the worst case of that.

### The board themes without repainting

Every color on the board is a CSS custom property, applied through `style`
rather than as an attribute — `fill` and `stroke` are CSS properties on SVG, so
`var()` resolves in them where a presentation attribute would not
(`src/canvas/render-cell.tsx`). A rectangle's element carries a palette *index*,
not a color; `--region-fill-3` and friends are what turn it into one.

So both palettes live in `index.css`, and switching themes sets one `data-theme`
attribute on the document root (`src/toolbar/use-theme.ts`). No element is
rewritten, nothing re-renders, and the graph never hears about it. The paper's
background is a stylesheet rule for the same reason — the `<Paper background>`
prop takes a color string, which cannot follow a theme.

The dark board is not the light one dimmed: fills are deep enough for white
numerals to sit on, and borders are lifted rather than darkened, because on a
dark ground it is the lighter edge that reads. With no stored choice the
system's preference wins and keeps winning, so a machine that switches to dark
in the evening takes the demo with it.

### Undo and redo are the library's

`<Diagram history>` puts a `dia.CommandManager` behind the graph;
`useGraphHistory` drives it and `useGraphHistoryStack` says whether there is
anything to undo, which is what disables the toolbar buttons. The keyboard
shortcuts come free: `interactions.commandManager` defaults to on and binds
Ctrl/Cmd + Z and Shift + Ctrl/Cmd + Z, so the demo binds no shortcut of its own
for them.

None of that would work if the rectangles lived in React state with the elements
derived from them, which is how this demo was first written. A CommandManager
undo puts the element back on the graph while React still holds the old array,
and the next sync writes it straight back out — the undo undoes nothing. Putting
the board on the graph is what buys the free history.

Two details keep the stack honest:

- The rectangle being dragged is a real element, added and moved on every
  pointer move. All of that is written with `{ skipHistory: true }`
  (`use-pending-cell.ts`), so the graph and the papers see it and the command
  manager does not. One placement is one press of undo, however long the drag
  was, and a refused or abandoned drag leaves the stack untouched.
- **Clear** removes every rectangle inside one `transaction()`, so a cleared
  board comes back in a single undo rather than one rectangle at a time.

Escape is the only shortcut the demo binds itself, on the same `<Diagram>`
keyboard, and it lives inside `useDrawRegion` because it acts on the drag that
hook owns. It also needs help from the drag: the region view has no way to abort
a gesture from outside — it resolves on pointerup and nothing else — so the hook
keeps a flag that drops the preview at once, ignores the moves that follow, and
throws away whatever the band finally resolves to.

### Neighboring rectangles never share a color

Each new rectangle takes the lowest palette entry none of its neighbors is
using (`src/puzzle/colors.ts`). Rectangles never overlap, so this greedy pick
always finds one — four colors would suffice for any planar arrangement, and
the palette has eight so a board does not look like four repeating tiles. The
color is resolved during the drag, against the rectangle under the cursor, so
it does not change when the rectangle commits.

### Boards are generated, and checked

There is no npm package that generates Shikaku boards, so `src/puzzle` does it:

- `generate.ts` cuts the grid into rectangles — walk the squares in random
  order, and let the first uncovered one anchor a rectangle drawn by weight from
  everything that fits — then writes each rectangle's area into one of its
  squares. Every board is solvable by construction.
- Solvable is not enough: the same numbers usually admit a second arrangement,
  and a Shikaku with two answers is a bad puzzle. `solve.ts` counts solutions by
  exact cover, branching on the square with the fewest candidates left, and the
  generator keeps cutting boards until one comes out unique. An attempt costs
  under 2 ms even at 25×25, so it can afford a hundred of them.
- Difficulty is the largest rectangle the generator may cut, scaled to the board.
  Bigger rectangles have more places to sit, which is what makes a board take
  thought. It also, usefully, makes boards more likely to be unique: long
  rectangles pin down whole rows, while a grid cut only into small blocks can
  almost always be re-cut somewhere else.
- `candidates.ts` defines "a legal rectangle for this number" once. The solver
  and the rule the board enforces while you drag are both phrased in terms of
  it, so the guarantee the generator makes and the rule the player meets cannot
  drift apart.
