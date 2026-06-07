# JointJS: HTML Form Ports (TypeScript)

The HTML Form Ports demo showcases a small data-mapping application built from elements that render HTML inside a `<foreignObject>`. A form element has a port directly under each of its fields; interface elements (input and output) are lists of items with a port next to each row.

### Features

- **Single absolute ports group** — all ports of an element share one group with `position: 'absolute'`; the coordinates are measured from the rendered HTML, so they stay aligned with any layout (multiple rows, wrapping, resize, zoom)
- **Two-way value sync** — typing into a form input updates the element model and vice versa
- **Computed fields** — read-only form fields derived live from the input fields, exposed via out ports
- **Value propagation** — values flow along the mapping links from the input interface, through the form, to the output interface, with a live preview while a link is being dragged (`link:snap:connect` / `link:snap:disconnect`)
- **Connection validation** — links go from out ports to in ports only and each in port accepts at most one inbound link
- **Link removal** — clicking a link removes it and the dependent values recalculate

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/html-form-ports/ts" target="_blank">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

This demo is also available online at [demos.jointjs.com](https://demos.jointjs.com/html-form-ports/).

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download html-form-ports/ts
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

Install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
