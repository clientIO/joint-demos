# JointJS+: CI Pipeline Editor <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

An editor of a CI/CD pipeline: steps that run commands, forks of parallel branches that join again, loops, decisions with named options, and the ends of the flow - the diagram as YAML alongside. The data is a flat map of nodes, the source of truth; the picture is laid out by `layout.TreeLayout` as a tree in which a node can be a *group*: a container with a start node, some content and an end node - a *fork* whose branches converge into its end, a *loop* whose return link climbs back from its end to its start. Groups nest and collapse; the diagram is laid out bottom-up, the deepest groups first. Everything is edited in place - add, insert, move, delete, collapse, rename - with undo, and the view fits the flow.

## Available Versions

- [TypeScript](./ts/)
- [React](./react/)

## Screenshot

![screenshot](./screenshot.png)
