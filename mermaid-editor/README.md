# JointJS+: Mermaid Editor <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

The Mermaid Editor demo turns [Mermaid](https://mermaid.js.org/) flowchart source into native JointJS cells. Mermaid's own parser reads the text, and the resulting nodes and edges are mapped onto declarative `@joint/react-plus` cell records — every Mermaid node shape is drawn as a real SVG element that sizes itself to its label (the classic delimiter shapes and the extended `@{ shape: … }` set alike), `@{ img: … }` nodes render as image cards, `subgraph` blocks become containers wrapping their members, edges keep their arrow heads, line styles, labels, `linkStyle` colours and curves, and `@{ animate: true }` marching-dash animation, and a directed-graph layout arranges the result in the direction the diagram declares. Edit the source on the left and the diagram on the right is reparsed and re-laid out as you type, with Mermaid syntax highlighting in a Monaco editor — find and replace, multiple cursors and full undo history included. Unlike a Mermaid-rendered image, the output is a live JointJS graph on a `PaperScroller` canvas you can pan and zoom, in a light or dark theme, exportable as SVG or as the `.mmd` source. Click a node and every mention of it lights up in the source; move the caret and the diagram follows; Shift-click grows the selection, and two selected nodes offer to connect. Double-click a node to rename it in place, across as many lines as you like, or select one for a toolbar carrying its shape (the classic nine plus the full extended `@{ shape: … }` catalogue), fill, text colour, bold/italic and border styling, hyperlink, image and an add-a-step action. Click an edge for its own toolbar: line pattern (solid, dotted, thick), arrow heads (point, circle, cross, both ends), colour, curved or straight routing, and the marching-dash animation toggle — each control writing a targeted edit back into the Mermaid text (`style`, `click`, `linkStyle` and edge statements included), so the source stays the single source of truth. Auto-layout can also be switched off: nodes then drag by hand, obstacle-avoiding orthogonal routing takes over the links, and hand-placed positions survive further source edits.

This demo is also available online at [jointjs.com](https://jointjs.com/demos/mermaid-editor).

## Available Versions

- [React](./react/)

## Screenshot

![screenshot](./screenshot.png)
