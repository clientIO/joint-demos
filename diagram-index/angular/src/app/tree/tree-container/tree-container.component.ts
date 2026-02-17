import { NestedTreeControl } from '@angular/cdk/tree';
import { AfterViewInit, Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { dia, highlighters, shapes, ui } from '@joint/plus';
import { TreeDataService } from '../tree-data.service';
import { TreeNode } from '../tree.models';

@Component({
  selector: 'app-tree-container',
  templateUrl: './tree-container.component.html',
  styleUrls: ['./tree-container.component.scss']
})
export class TreeContainerComponent implements OnInit, AfterViewInit {
  trees: TreeNode[];
  nodes: { [key: string]: TreeNode } = {};
  treeControl = new NestedTreeControl<TreeNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<TreeNode>();
  selectedNode: TreeNode;
  graph: dia.Graph;
  paper: dia.Paper;
  @ViewChild('canvas') canvas: ElementRef;

  constructor(private treeDataService: TreeDataService) {
    this.trees = this.treeDataService.getTree();
    this.dataSource.data = this.trees;
    this.trees.forEach(node => {
      this.nodes[node.id] = node;
      if (node.children) {
        node.children.forEach(node => {
          this.nodes[node.id] = node;
        });
      }
    });

    this.selectedNode = this.trees[0];
    this.selectedNode.selected = true;
    this.treeControl.toggle(this.selectedNode);
    this.graph = new dia.Graph({}, { cellNamespace: shapes });
    this.graph.fromJSON(<dia.Graph>this.trees[0].graph);
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.paper = new dia.Paper({
      model: this.graph,
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
      paper: this.paper,
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

    this.canvas.nativeElement.appendChild(scroller.el);
    scroller.render().centerContent({ useModelGeometry: true });
    this.paper.unfreeze();

    this.paper.on('cell:pointerclick', (cellView) => {
      const cell = cellView.model;
      const nodeId = `${this.graph.id}-${cell.id}`;
      this.graph.set('selectedCell', cell.id);
      this.treeControl.expand(this.nodes[this.graph.id]);
      this.selectTreeNode(this.nodes[nodeId]);
    });

    this.paper.on('blank:pointerclick', () => {
      this.graph.set('selectedCell', null);
      this.selectTreeNode(this.nodes[this.graph.id]);
      (document.activeElement as HTMLElement)?.blur();
    });

    this.paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));

    let selectionFrame: highlighters.mask | null = null;

    this.paper.listenTo(this.graph, 'change:selectedCell', () => {
      if (selectionFrame) {
        selectionFrame.remove();
        selectionFrame = null;
      }
      const cellId = this.graph.get('selectedCell');
      const cell = this.graph.getCell(cellId);
      if (cell) {
        selectionFrame = highlighters.mask.add(
          cell.findView(this.paper),
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
  }

  hasChild = (_: number, node: TreeNode) => !!node.children && node.children.length > 0;

  selectTreeNode(node: TreeNode) {
    if (this.selectedNode && this.selectedNode.id !== node.id) {
      this.selectedNode.selected = false;
    }
    const [ graphId, cellId ] = node.id.split('-');
    if (graphId !== this.graph.id) {
      this.graph.fromJSON(<dia.Graph>this.nodes[graphId].graph);
    }
    if (cellId) {
      this.graph.set('selectedCell', cellId);
    }
    this.selectedNode = node;
    this.selectedNode.selected = true;
  }

  onNodeClick(node: TreeNode) {
    this.treeControl.toggle(node);
    this.selectTreeNode(node);
  }
}
