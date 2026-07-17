import { dia, ui, highlighters, util } from '@joint/plus';

const graph = new dia.Graph();
const paper = new dia.Paper({ model: graph });
const stencil = new ui.Stencil({ paper });
highlighters.addClass.add(stencil.el, 'body', 'active');
console.log(stencil);
