import { useEffect, useRef, useState } from 'react';
import { dia, ui, shapes, highlighters } from '@joint/plus';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TreeData } from './tree-data';

import './App.scss';

function App() {

  const canvasEl: any = useRef(null);
  const treeEl: any = useRef(null);

  const [initialDiagram = { id: '', cells: [] }] = TreeData;
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<string[]>([initialDiagram.id]);
  const [selectedTreeNode, setSelectedTreeNode] = useState<string>(initialDiagram.id);
  const [graph] = useState(() => {
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    graph.fromJSON(initialDiagram);
    return graph;
  });
  const [diagrams] = useState(() => {
    return TreeData.map(diagram => {
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
    })
  });

  const selectTreeNode = (nodeId: string) => {
    const [diagramId, cellId = null] = nodeId.split('-');
    if (cellId) {
      setExpandedTreeNodes((expandedTreeNodes) => {
        if (expandedTreeNodes.includes(`${diagramId}`)) {
          return expandedTreeNodes;
        }
        return [...expandedTreeNodes, `${diagramId}`];
      });
    }
    setSelectedTreeNode(nodeId);
  }

  const selectNode = (nodeId: string) => {
    const [diagramId, cellId = null] = nodeId.split('-');
    const [selectedDiagramId] = selectedTreeNode.split('-');
    if (diagramId !== selectedDiagramId) {
      const prevDiagram = diagrams.find(diagram => diagram.id === selectedDiagramId);
      if (prevDiagram) {
        // Save Changes (not in use since the demo is in view-only mode)
        prevDiagram.graph.fromJSON(graph.toJSON());
      }
      const diagram = diagrams.find(diagram => diagram.id === diagramId);
      if (diagram) {
        graph.fromJSON(diagram.graph.toJSON());
      }
    }
    graph.set('selectedCell', cellId);
    selectTreeNode(nodeId);
  }

  const handleToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setExpandedTreeNodes(nodeIds);
  };

  const handleSelect = (event: React.SyntheticEvent) => {
    (event.currentTarget as HTMLElement).focus();
  };

  const handleFocus = (event: React.SyntheticEvent, nodeId: string) => {
    selectNode(nodeId);
  };

  useEffect(() => {

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

    canvasEl.current.appendChild(scroller.el);
    scroller.render().centerContent({ useModelGeometry: true });
    paper.unfreeze();

    // User Interactions

    paper.on('cell:pointerclick', (cellView) => {
      const cell = cellView.model;
      const nodeId = `${graph.id}-${cell.id}`;
      graph.set('selectedCell', cell.id);
      selectTreeNode(nodeId);
      treeEl.current.querySelector(`.node-${nodeId}`)?.focus();
    });

    paper.on('blank:pointerclick', () => {
      graph.set('selectedCell', null);
      selectTreeNode(`${graph.id}`);
      (document.activeElement as HTMLElement)?.blur();
    });

    paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));

    // Selection Frame

    let selectionFrame: highlighters.mask | null = null;

    paper.listenTo(graph, 'change:selectedCell', () => {
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
    });

    return () => {
      paper.remove();
      scroller.remove();
    }

  }, [graph]);

  return (
      <div className='app'>
          <TreeView
              className='tree'
              aria-label='diagram navigation'
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
              expanded={expandedTreeNodes}
              selected={selectedTreeNode}
              onNodeToggle={handleToggle}
              onNodeFocus={handleFocus}
              onNodeSelect={handleSelect}
              sx={{ height: 240, flexGrow: 1, overflowX: 'hidden' }}
              ref={treeEl}
          >
              {diagrams.map((diagram) => (
                  <TreeItem
                      key={diagram.id}
                      nodeId={diagram.id}
                      label={diagram.name}
                  >
                      {diagram.nodes.map((node) => (
                          <TreeItem
                              className={`node-${node.id}`}
                              key={node.id}
                              nodeId={node.id}
                              label={node.name}
                              icon={node.isElement ? '▱' : '⇢'}
                          />
                      ))}
                  </TreeItem>
              ))}
          </TreeView>
          <div className='canvas' ref={canvasEl} />
      </div>
  );
}

export default App;
