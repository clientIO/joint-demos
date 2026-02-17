import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { dia, shapes, ui } from '@joint/plus';
import { HyperlinkHighlighter } from '../hyperlink-highlighter';
import { Tab } from '../tabs.models';

@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss']
})
export class TabComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvas: ElementRef;
  @Input() tab: Tab;
  @Output() onLinkClick: EventEmitter<string> = new EventEmitter<string>();

  private graph: dia.Graph;
  private paper: dia.Paper;
  private scroller: ui.PaperScroller;
  private focusPoint: dia.Point | undefined;

  constructor() { }

  ngOnInit(): void {
    this.graph = new dia.Graph({}, { cellNamespace: shapes });

    if (this.tab.graph) {
      this.graph.fromJSON(this.tab.graph);
      this.focusPoint = this.graph.getBBox()?.center().toJSON();
    }

    this.paper = new dia.Paper({
        model: this.graph,
        background: {
            color: '#F8F9FA',
        },
        frozen: true,
        async: true,
        gridSize: 10,
        cellViewNamespace: shapes,
        defaultConnectionPoint: { name: 'boundary' }
    });

    this.scroller = new ui.PaperScroller({
        paper: this.paper,
        baseWidth: 10,
        baseHeight: 10,
        autoResizePaper: true,
        contentOptions: {
          minWidth: 600,
          allowNewOrigin: 'any',
          allowNegativeBottomRight: true,
          useModelGeometry: true,
          padding: 100
        },
        cursor: 'grab'
    });

    this.scroller.render();

    this.paper.on('element:link', (elementView: dia.ElementView, evt: dia.Event) => {
      const { subgraphId } = elementView.model.attributes;
      if (!subgraphId) return;
      evt.stopPropagation();
      this.onLinkClick.emit(subgraphId);
    });

    this.paper.on('blank:pointerdown', (evt) => {
      this.scroller.startPanning(evt);
    });

    this.graph.getElements().forEach((element) => {
      HyperlinkHighlighter.addToLabel(element, this.paper, 'subgraphId');
    });
  }

  ngAfterViewInit(): void {
    this.canvas.nativeElement.appendChild(this.scroller.el);
  }

  focus(): void {
    if (this.focusPoint) {
      this.scroller.center(this.focusPoint.x, this.focusPoint.y);
    } else {
      this.scroller.center();
    }
    this.paper.unfreeze();
  }

  blur(): void {
    if (!this.paper.isFrozen()) {
      this.focusPoint = this.scroller.getVisibleArea().center().toJSON();
      this.paper.freeze();
    }
  }
}
