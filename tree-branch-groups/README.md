# JointJS+: Tree Layout with Branch Groups <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A tree laid out by `layout.TreeLayout` in which a node can be a *branch group*: a container with a start node, two branches and an end node the branches converge into. The tree connects to the group as a single node, so a fork/join subgraph — which a tree layout cannot handle on its own — fits into the tree. Groups nest and collapse; the diagram is laid out bottom-up, the deepest groups first.

## Available Versions

- [TypeScript](./ts/)
- [React](./react/)

## Screenshot

![screenshot](./screenshot.png)
