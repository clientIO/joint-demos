<script lang="ts" setup>
import TreeView from './TreeView.vue';
import { ref, onMounted, shallowRef, triggerRef } from 'vue';
import { dia, ui, shapes, highlighters } from '@joint/plus';
import treeData from './tree-data';

const canvas = ref(null);
const graph = new dia.Graph({}, { cellNamespace: shapes })
const paper = new dia.Paper({
  model: graph,
  async: true,
  frozen: true,
  cellViewNamespace: shapes,
  clickThreshold: 10,
  moveThreshold: 10,
  interactive: false,
  defaultConnectionPoint: {
    name: 'boundary'
  }
});

const scroller = new ui.PaperScroller({
  paper,
  autoResizePaper: true,
  cursor: 'grab',
  baseWidth: 1,
  baseHeight: 1,
  padding: 0,
  contentOptions: {
    useModelGeometry: true,
    padding: 200
  }
});

const parsedData = treeData.map(diagram => {
  const graph = new dia.Graph({}, { cellNamespace: shapes });
  graph.fromJSON(diagram);
  return {
    id: diagram.id,
    name: diagram.name,
    graph,
    nodes: graph.getCells().map(cell => {
      return {
        id: `${diagram.id}-${cell.id}`,
        name: cell.isElement()
          ? cell.attr(['label', 'text']) || `Element (${cell.id})`
          : cell.prop(['labels', 0, 'attrs', 'text', 'text']) || `Link (${cell.id})`,
        isElement: cell.isElement(),
      }
    })
  }
});

const data = shallowRef(parsedData);
const activeId = ref(data.value[0].id);

onMounted(() => {
  if (!canvas.value) return;

  (canvas.value as HTMLDivElement).appendChild(scroller.el);

  scroller.render().centerContent({ useModelGeometry: true });
  paper.unfreeze();
});

const onActiveItemChange = (id: string, diagram: dia.Graph) => {

  const [diagramId, cellId = null] = id.split('-');
  const [prevDiagramId] = activeId.value.split('-');

  if (diagramId !== prevDiagramId) {
    console.log('switching diagrams');
    const prevDiagramIndex = data.value.findIndex((diagram) => diagram.id === prevDiagramId);

    // Save Changes (not in use since the demo is in view-only mode)
    if (prevDiagramIndex !== -1) {
        const json = graph.toJSON();
        data.value[prevDiagramIndex].graph.fromJSON(json);
        data.value[prevDiagramIndex].nodes = graph.getCells().map(cell => {
          return {
            id: `${graph.id}-${cell.id}`,
            name: cell.isElement()
              ? cell.attr(['label', 'text']) || `Element (${cell.id})`
              : cell.prop(['labels', 0, 'attrs', 'text', 'text']) || `Link (${cell.id})`,
            isElement: cell.isElement(),
          }
        });
      triggerRef(data);
    }
  }

  activeId.value = id;
  graph.fromJSON(diagram.toJSON())
  scroller.render().centerContent({ useModelGeometry: true });
  graph.set('selectedCell', cellId);
  highlightCell();
};

// User Interactions
paper.on('cell:pointerclick', (cellView) => {
  const cell = cellView.model;
  graph.set('selectedCell', cell.id);
  activeId.value = `${graph.id}-${cell.id}`;
});

paper.on('blank:pointerclick', () => {
  graph.set('selectedCell', null);
  activeId.value = graph.id.toString();
});

paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));

// Selection Frame
let selectionFrame: highlighters.mask | null = null;

const highlightCell = () => {
  if (selectionFrame) {
    selectionFrame.remove();
    selectionFrame = null;
  }

  const cellId = graph.get('selectedCell');
  const cell = graph.getCell(cellId);

  if (cell) {
    selectionFrame = highlighters.mask.add(
      cell.findView(paper),
      cell.isLink() ? 'line' : 'body',
      'selection-frame',
      {
        layer: dia.Paper.Layers.BACK,
        padding: 4,
        attrs: {
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'opacity': '0.6'
        }
      }
    );
  }
}

paper.listenTo(graph, 'change:selectedCell', highlightCell);
</script>

<template>
  <TreeView :data="data" :active-id="activeId" @active-item-change="onActiveItemChange" />
  <div class="canvas" ref="canvas"></div>
</template>

<style lang="scss">
  @import "~@joint/plus/joint-plus.css";

  * {
    box-sizing: border-box;
    line-height: 1.5;
    font-weight: 400;
    font-size: 1rem;
    font-family: Roboto, Helvetica, Arial, sans-serif;
  }

  body {
    margin: 0;
    padding: 0;
  }

  #app {
    height: 100vh;
    width: 100vw;
    display: flex;
  }

  .canvas {
    flex-grow: 1;
    max-height: 100%;
  }

  .joint-paper {
    .joint-highlight-mask {
        fill: #08B081;
    }

    // Arrowheads
    marker path {
        stroke: #08B081;
        fill: #08B081;
    }

    .joint-link [joint-selector="line"],
    .joint-element ellipse,
    .joint-element path,
    .joint-element rect {
        stroke: #08B081;
    }
}
</style>
