# JointJS+: Tree Layout with Forks and Loops <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A tree laid out by `layout.TreeLayout` in which a node can be a *group*: a container with a start node, some content and an end node. A *fork group* holds two branches that converge into the end node — a fork/join. A *loop group* holds a tree whose end node links back to the start node — a cycle, drawn as a dashed return link up the left side of the group. The tree connects to a group as a single node, so subgraphs that a tree layout cannot handle on its own fit into the tree. Groups nest and collapse; the diagram is laid out bottom-up, the deepest groups first.

## Available Versions

- [TypeScript](./ts/)
- [React](./react/)

## Screenshot

![screenshot](./screenshot.png)
