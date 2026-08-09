# JointJS: Standalone Link Routing with Libavoid

Libavoid is a library that offers high-quality polyline and orthogonal link routing, effectively navigating around objects and avoiding overlapping parallel links. It is particularly useful when used in conjunction with interactive diagram editors, such as those that can be created with JointJS. This demo showcases the functionality of Libavoid, integrated into a JointJS diagram.

## Available Versions

- [JavaScript](./js/) — three variants: the router on the UI thread, in a Web
  Worker, and a Web Worker performance stress test.
- [React](./react/) — the Web Worker performance variant, with React-rendered
  nodes on a `@joint/react-plus` canvas using virtual rendering and a quad-tree
  spatial index.

## Screenshot

![screenshot](./screenshot.png)
