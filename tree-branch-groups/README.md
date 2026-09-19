# JointJS+: Tree Layout with Branch Groups <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A tree laid out by `layout.TreeLayout` in which a node can be a *group*: a container with a start node, some content and an end node. A *branch group* holds two branches that converge into the end node — a fork/join. A *cycle group* holds a tree that grows down on the right and a return path that climbs back up on the left, from the end node to the start node — a loop. The tree connects to a group as a single node, so subgraphs that a tree layout cannot handle on its own fit into the tree. Groups nest and collapse; the diagram is laid out bottom-up, the deepest groups first.

## Available Versions

- [TypeScript](./ts/)
- [React](./react/)

## Screenshot

![screenshot](./screenshot.png)
