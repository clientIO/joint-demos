import { dia, shapes } from '@joint/core';

const graph = new dia.Graph();
const paper = new dia.Paper({ model: graph });
const tab = new shapes.standard.Rectangle();
graph.addCell(tab);
console.log(paper);
