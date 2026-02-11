import { dia, shapes, util } from '@joint/plus';
import { PlaceholderAttributes, PlaceholderShapeTypes } from './placeholder-config';

export class BPMNLinkView extends dia.LinkView {
    constructor() {
        super(...arguments);
        
        this.savedLinkAttributes = {
            router: 'normal',
            attrs: {}
        };
        this.savedLinkVertices = [];
    }
    
    saveCurrentLinkState() {
        var _a, _b;
        const router = (_b = (_a = this.model.router()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'normal';
        this.savedLinkAttributes = {
            router,
            attrs: this.model.attr()
        };
        this.savedLinkVertices = this.model.vertices();
    }
    
    changeStyle(linkType) {
        const { router, attrs } = PlaceholderAttributes[linkType];
        const resetAttrs = {
            line: {
                sourceMarker: null,
                targetMarker: null,
                strokeDasharray: 'none',
            }
        };
        
        const verticesToApply = linkType === PlaceholderShapeTypes.LINK ? [] : this.savedLinkVertices;
        this.applyLinkProperties(util.merge(resetAttrs, attrs), router, verticesToApply);
    }
    
    startArrowheadMove(end, options) {
        this.saveCurrentLinkState();
        
        const data = super.startArrowheadMove(end, options);
        this.highlightEmbeddedLanes(data);
        
        return data;
    }
    
    dragArrowheadEnd(evt, x, y) {
        var _a, _b, _c;
        const eventData = this.eventData(evt);
        
        const canLinkExist = !!(this.model.source().id) && !!(this.model.target().id);
        const isEndSame = ((_a = eventData.initialEnd) === null || _a === void 0 ? void 0 : _a.id) === ((_b = eventData.prevEnd) === null || _b === void 0 ? void 0 : _b.id);
        
        if (!canLinkExist || isEndSame) {
            this.restoreSavedLinkState();
        }
        else {
            // If the link is valid, ensure the original stroke style and vertices are applied
            // (or the last saved ones if they were modified by placeholder logic)
            this.model.attr('line/stroke', (_c = this.savedLinkAttributes.attrs.line) === null || _c === void 0 ? void 0 : _c.stroke, { ignoreHistory: true });
            this.model.vertices(this.savedLinkVertices, { ignoreHistory: true });
        }
        
        super.dragArrowheadEnd(evt, x, y);
    }
    
    highlightEmbeddedLanes(data) {
        var _a;
        if (!((_a = this.paper) === null || _a === void 0 ? void 0 : _a.options.markAvailable) || !data.marked)
            return;
        
        const markedKeys = Object.keys(data.marked || {});
        const paper = this.paper;
        
        if (!paper)
            return;
        
        for (const id of markedKeys) {
            const cell = paper.model.getCell(id);
            if (!cell || !shapes.bpmn2.CompositePool.isPool(cell))
                continue;
            
            const lanes = cell.getSwimlanes();
            for (const lane of lanes) {
                const laneView = lane.findView(paper);
                if (laneView) {
                    laneView.highlight(null, { elementAvailability: true });
                    // Ensure the lane itself is marked as available for connection feedback
                    data.marked[lane.id] = [laneView.el];
                }
            }
        }
    }
    
    restoreSavedLinkState() {
        const { attrs, router } = this.savedLinkAttributes;
        this.applyLinkProperties(attrs, router, this.savedLinkVertices);
    }
    
    applyLinkProperties(attrs, router, vertices) {
        this.model.attr(attrs, { ignoreHistory: true });
        this.model.router(router, { useVertices: true }, { ignoreHistory: true });
        this.model.vertices(vertices, { ignoreHistory: true });
    }
}
