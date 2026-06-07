# JointJS: HTML Form Ports

The HTML Form Ports demo showcases a small data-mapping application built from elements that render HTML inside a `<foreignObject>`. A form element has a port directly under each of its fields; interface elements (input and output) are lists of items with a port next to each row. All ports belong to a single ports group with an absolute position layout — the port coordinates are measured from the rendered HTML, so they stay aligned with the content regardless of the layout. Values propagate along the mapping links: from the input interface into the form's input fields, through the form's computed fields (filled dynamically from the input fields), and on to the output interface.

This demo is also available online at [demos.jointjs.com](https://demos.jointjs.com/html-form-ports/).

## Available Versions

- [TypeScript](./ts/)

## Screenshot

![screenshot](./screenshot.png)
