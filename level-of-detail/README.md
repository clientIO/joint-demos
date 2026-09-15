# JointJS+: Level of Detail <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A 1,200-node service map where every element swaps its rendering for a cheaper one as you zoom out: a full card at reading zoom, a plain chip in the middle, and a single tinted rectangle when the whole map is on screen.

Virtual rendering decides *how many* elements are drawn; level of detail decides *how much each one draws*. The two are independent, and the second is the one that survives zooming out — frame the whole map and all 1,200 elements really are inside the viewport, so there is nothing for virtual rendering to skip and the level of detail is the only lever left.

## Available Versions

- [TypeScript](./ts/)
- [React](./react/)

## Screenshot

![screenshot](./screenshot.png)
