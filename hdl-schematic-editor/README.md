# JointJS+: HDL Schematic Editor <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

The HDL Schematic Editor demo app lets you view and edit a digital circuit netlist in the [Yosys](https://yosyshq.net/yosys/) JSON format as a schematic diagram. Drag the shapes from the stencil and move them freely - the wires are routed with [libavoid](https://github.com/mjwybrow/adaptagrams) (`@joint/router-avoid`). The diagram can be arranged automatically with [ELK](https://eclipse.dev/elk/) (`@joint/layout-elk`). The Yosys JSON is updated live as you edit the circuit.

## Available Versions

- [TypeScript](./ts/)

## Screenshot

![screenshot](./screenshot.png)
