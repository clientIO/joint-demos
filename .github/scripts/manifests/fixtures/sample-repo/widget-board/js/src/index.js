import { dia, ui } from '@joint/plus';

const graph = new dia.Graph();
const paper = new dia.Paper({ model: graph });
const stencil = new ui.Stencil({ paper });
console.log(stencil);
