import * as joint from '@joint/core';

const options: joint.dia.Paper.Options = { gridSize: 10 };
const paper = new joint.dia.Paper(options);
const rect = new joint.shapes.standard.Rectangle();
paper.model.addCell(rect);
