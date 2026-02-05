import type { dia, g } from '@joint/plus';
import { shapes, ui, util, highlighters, mvc } from '@joint/plus';
import type { TaskElement } from './TaskElement';
import type { TaskId, TaskResource } from './types';
import type { PertChartOptions } from './PertChart';
import { StencilHoverHighlighter } from './StencilHoverHighlighter';
import { getItemIcon } from './utils';

export interface AssignmentChangeData {
    task: TaskId;
    resource: number | null;
    action: 'add' | 'remove';
}

interface ResourcesContext {
    stencil: ui.Stencil;
    scroller: ui.PaperScroller;
    paper: dia.Paper;
    graph: dia.Graph;
    resources: Record<string, TaskResource>;
    changeAssignment: (data: AssignmentChangeData[]) => void;
}

interface ResourcesData {
    overlay: HTMLDivElement;
    targetTask: TaskElement | null;
    sourceTask: TaskElement | null;
}

export function initializeAssignments(
    scroller: ui.PaperScroller,
    options: PertChartOptions,
) {
    const{ resources, onChange: changeAssignment = () => {} } = options.assignments;
    const paper = scroller.options.paper;
    const graph = paper.model;

    const stencil = new ui.Stencil({
        width: 30,
        height: null,
        paper: scroller,
        layout: {
            marginX: 6,
            marginY: 6,
            columns: 1,
            rowGap: 2,
        },
        paperOptions: {
            overflow: true
        },
        contentOptions: {
            useModelGeometry: true,
        },
    });

    stencil.el.style.position = 'absolute';
    stencil.el.style.top = options.toolbar !== false ? '138px' : '10px';
    stencil.el.style.left = '10px';
    stencil.el.style.bottom = 'auto';
    stencil.el.style.right = 'auto';
    stencil.el.style.width = '40px';
    stencil.el.style.height = 'fit-content';

    stencil.render();

    loadResources(stencil, resources);

    const listener = new mvc.Listener<[ResourcesContext]>({
        scroller,
        paper,
        graph,
        stencil,
        resources,
        changeAssignment
    });
    listener.listenTo(stencil, {
        'element:dragstart': onDragStart,
        'element:drag': onDrag,
        'element:dragend': onDragEnd
    });
    listener.listenTo(paper, {
        'element:assignee:pointerdown': onElementAssigneePointerDown
    });

    return { stencil, listener };
}

// Handle the start of dragging a resource from the stencil
function onDragStart(ctx: ResourcesContext, taskView: dia.ElementView, evt: dia.Event, dropTarget: g.Rect) {
    // render a div over the paper to allow cursor change based on drop target
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
    evt.data.overlay = overlay;
    // Run the initial check for a valid drop target
    onDrag(ctx, taskView, evt, dropTarget);
}

// Handle dragging a resource from the stencil over the paper
function onDrag(ctx: ResourcesContext, taskView: dia.ElementView, evt: dia.Event, dropTarget: g.Rect) {
    const { scroller, paper, graph } = ctx;
    const { overlay } = evt.data as ResourcesData;
    const { x, y } = dropTarget.center();
    const [targetTask = null] = graph.findElementsAtPoint({ x, y });
    if (targetTask) {
        // valid drop target
        overlay.style.cursor = evt.altKey ? 'copy' : 'alias';
        highlighters.addClass.add(targetTask.findView(paper), 'assigneeRow', 'assignee-drop-target', {
            className: 'assignee-drop-target'
        });
        evt.data.targetTask = targetTask as TaskElement;
    } else {
        // not a valid drop target
        overlay.style.cursor = 'no-drop';
        highlighters.addClass.removeAll(paper);
        evt.data.targetTask = null;
    }
    scroller.scrollWhileDragging(evt, x, y);
}

// Handle the end of dragging a resource from the stencil
function onDragEnd(ctx: ResourcesContext, taskView: dia.ElementView, evt: dia.Event) {
    const { scroller, stencil, paper, resources, changeAssignment } = ctx;
    const { sourceTask, targetTask, overlay } = evt.data as ResourcesData;
    scroller.stopScrollWhileDragging(evt);
    stencil.cancelDrag();
    overlay.remove();
    highlighters.addClass.removeAll(paper, 'assignee-drop-target');
    // Which resource is being assigned?
    const resource = resources[taskView.model.get('resourceId')];

    if (!resource) return; // Safeguard
    if (sourceTask === targetTask) return; // No change

    const changeData: AssignmentChangeData[] = [];
    // Remove the resource from the source task unless Alt key is pressed.
    if (!evt.altKey && sourceTask) {
        changeData.push({ task: sourceTask.id, resource: resource.id, action: 'remove' });
    }
    // Assign the resource to the target task.
    if (targetTask && !targetTask.hasAssignee(Number(resource.id))) {
        changeData.push({ task: targetTask.id, resource: resource.id, action: 'add' });
    }
    if (changeData.length > 0) {
        changeAssignment(changeData);
    }
}

// Handle click on an assignee icon in a task
function onElementAssigneePointerDown(ctx: ResourcesContext, taskView: dia.ElementView, evt: dia.Event) {
    const { stencil } = ctx;
    evt.stopPropagation();
    taskView.preventDefaultInteraction(evt);
    const task = taskView.model as TaskElement;
    const assigneeId = Number(taskView.findAttribute('data-assignee-id', evt.target));
    const resource = task.getAssignees().find(r => r.id === assigneeId);
    if (!resource) return;
    // Prepare data for the drag operation
    evt.data.sourceTask = task;
    evt.data.targetTask = task;
    // Start dragging the resource from the task
    stencil.startDragging(createResourceElement(resource), evt);
}

// Load resources into the stencil
function loadResources(stencil: ui.Stencil, resources: Record<string, TaskResource>) {
    const stencilElements = util.sortBy(Object.keys(resources).map(resourceId => {
        const resource = resources[resourceId];
        return createResourceElement(resource);
    }), (el) => el.get('name').toLowerCase());

    stencil.load(stencilElements);
    const stencilPaper = stencil.getPaper();
    stencil.getGraph().getElements().forEach((el) => {
        StencilHoverHighlighter.add(
            el.findView(stencilPaper),
            'root',
            'stencil-highlight',
            {
                className: 'stencil-background-highlight',
                padding: 1,
                width: 90
            }
        );
    });
}

// Create a resource element for the stencil
function createResourceElement(resource: TaskResource) {
    return new shapes.standard.Image({
        resourceId: resource.id,
        name: resource.name,
        size: { width: 30, height: 30 },
        attrs: {
            image: {
                xlinkHref: resource.icon || getItemIcon('assignee', '#cecece'),
            },
            label: {
                text: resource.name,
                x: 'calc(w + 10)',
                y: 'calc(h / 2)',
                textAnchor: 'start',
                textVerticalAnchor: 'middle',
                fontSize: 12,
                fontFamily: 'Arial, helvetica, sans-serif',
                fill: '#000000'
            }
        },
    });
}
