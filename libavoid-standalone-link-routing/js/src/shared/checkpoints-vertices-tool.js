import { linkTools, util, g } from '@joint/core';

// A Vertices tool variant that reads/writes the link's `checkpoints`
// property instead of `vertices`. This allows the router to own `vertices`
// (the full routed path) while the user edits checkpoints (waypoints
// that the router must route through).
//
// This relies on the `getVertices()` / `setVertex()` / `insertVertex()` /
// `removeVertex()` abstraction that will be added to the core Vertices tool.
// Until then, we override the methods that directly access `model.vertices()`.

export const CheckpointsVertices = linkTools.Vertices.extend({

    name: 'checkpoints-vertices',

    getVertices: function() {
        return util.cloneDeep(this.relatedView.model.get('checkpoints')) || [];
    },

    setVertex: function(index, _vertex, opt) {
        const model = this.relatedView.model;
        const checkpoints = util.cloneDeep(model.get('checkpoints')) || [];
        checkpoints[index] = _vertex;
        model.set('checkpoints', checkpoints, opt);
    },

    insertVertex: function(index, vertex, opt) {
        const model = this.relatedView.model;
        const checkpoints = util.cloneDeep(model.get('checkpoints')) || [];
        checkpoints.splice(index, 0, vertex);
        model.set('checkpoints', checkpoints, opt);
    },

    removeVertex: function(index, opt) {
        const model = this.relatedView.model;
        const checkpoints = util.cloneDeep(model.get('checkpoints')) || [];
        checkpoints.splice(index, 1);
        model.set('checkpoints', checkpoints, opt);
    },

    // The core Vertices tool reads from model.vertices() in these methods.
    // We override them to use this.getVertices() (checkpoints) instead.

    update: function() {
        var vertices = this.getVertices();
        if (vertices.length === this.handles.length) {
            this.updateHandles();
        } else {
            this.resetHandles();
            this.renderHandles();
        }
        if (this.options.vertexAdding) {
            this.updatePath();
        }
        return this;
    },

    renderHandles: function() {
        var vertices = this.getVertices();
        for (var i = 0, n = vertices.length; i < n; i++) {
            var vertex = vertices[i];
            var handle = new (this.options.handleClass)({
                index: i,
                paper: this.paper,
                scale: this.options.scale,
                guard: (evt) => this.guard(evt),
            });
            handle.render();
            handle.position(vertex.x, vertex.y);
            this.simulateRelatedView(handle.el);
            handle.vel.appendTo(this.el);
            this.handles.push(handle);
            this.startHandleListening(handle);
        }
    },

    updateHandles: function() {
        var vertices = this.getVertices();
        for (var i = 0, n = vertices.length; i < n; i++) {
            var vertex = vertices[i];
            var handle = this.handles[i];
            if (!handle) return;
            handle.position(vertex.x, vertex.y);
        }
    },

    getNeighborPoints: function(index) {
        var linkView = this.relatedView;
        var vertices = this.getVertices();
        var prev = index > 0 ? vertices[index - 1] : linkView.sourceAnchor;
        var next =
            index < vertices.length - 1
                ? vertices[index + 1]
                : linkView.targetAnchor;
        return {
            prev: new g.Point(prev),
            next: new g.Point(next),
        };
    },

    onHandleChanging: function(handle, evt) {
        const { options, relatedView: linkView } = this;
        var index = handle.options.index;
        var [normalizedEvent, x, y] = linkView.paper.getPointerArgs(evt);
        var vertex = { x, y };
        this.snapVertex(vertex, index);
        this.setVertex(index, vertex, { ui: true, tool: this.cid });
        handle.position(vertex.x, vertex.y);
        if (!options.stopPropagation)
            linkView.notifyPointermove(normalizedEvent, x, y);
    },

    onHandleChanged: function(_handle, evt) {
        const { options, relatedView: linkView } = this;
        if (options.vertexAdding) this.updatePath();
        // Skip redundancyRemoval – it operates on model.vertices which is
        // the router output, not the checkpoints we are editing.
        this.blur();
        linkView.model.stopBatch('vertex-move', { ui: true, tool: this.cid });
        if (this.eventData(evt).vertexAdded) {
            linkView.model.stopBatch('vertex-add', {
                ui: true,
                tool: this.cid,
            });
        }
        const [normalizedEvt, x, y] = linkView.paper.getPointerArgs(evt);
        if (!options.stopPropagation)
            linkView.notifyPointerup(normalizedEvt, x, y);
        linkView.checkMouseleave(normalizedEvt);
    },

    onHandleRemove: function(handle, evt) {
        var index = handle.options.index;
        var linkView = this.relatedView;
        this.removeVertex(index, { ui: true });
        if (this.options.vertexAdding) this.updatePath();
        linkView.checkMouseleave(util.normalizeEvent(evt));
    },

    onPathPointerDown: function(evt) {
        if (this.guard(evt)) return;
        evt.stopPropagation();
        evt.preventDefault();
        var normalizedEvent = util.normalizeEvent(evt);
        var vertex = this.paper
            .snapToGrid(normalizedEvent.clientX, normalizedEvent.clientY)
            .toJSON();
        var relatedView = this.relatedView;
        relatedView.model.startBatch('vertex-add', {
            ui: true,
            tool: this.cid,
        });
        var checkpoints = this.getVertices();
        var index = this.getInsertIndex(vertex, checkpoints);
        this.snapVertex(vertex, index);
        this.insertVertex(index, vertex, { ui: true, tool: this.cid });
        this.update();
        var handle = this.handles[index];
        this.eventData(normalizedEvent, { vertexAdded: true });
        handle.onPointerDown(normalizedEvent);
    },

    // Find the insertion index among existing checkpoints by determining
    // which segment of the source → checkpoints → target polyline the
    // new point is closest to.
    getInsertIndex: function(vertex, checkpoints) {
        if (!checkpoints || checkpoints.length === 0) return 0;
        var relatedView = this.relatedView;
        var allPoints = [];
        if (relatedView.sourceAnchor) {
            allPoints.push(new g.Point(relatedView.sourceAnchor));
        }
        checkpoints.forEach(function(cp) {
            allPoints.push(new g.Point(cp));
        });
        if (relatedView.targetAnchor) {
            allPoints.push(new g.Point(relatedView.targetAnchor));
        }
        if (allPoints.length < 2) return 0;
        var point = new g.Point(vertex);
        var bestIndex = 0;
        var bestDistance = Infinity;
        for (var i = 0; i < allPoints.length - 1; i++) {
            var line = new g.Line(allPoints[i], allPoints[i + 1]);
            var closest = line.closestPoint(point);
            var dist = point.distance(closest);
            if (dist < bestDistance) {
                bestDistance = dist;
                bestIndex = i;
            }
        }
        return bestIndex;
    },
});
