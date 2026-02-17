<script>
    import { onMount, getContext } from "svelte";
    import { dia, ui, shapes } from "@joint/plus";
    import { HyperlinkHighlighter } from "../hyperlink-highlighter.ts";
    import { TABS } from "./Tabs.svelte";
    import { tabStore } from "../store";

    /* 
        Props - Svelte convention is to use 'export let' for props
    */
    export let index;
    export let tabs;

    const { updateTabByIndex } = getContext(TABS);

    /* 
        Extend the default activity icons with all events icons
    */
    Object.assign(
        shapes.bpmn2.Activity.ACTIVITY_TYPE_ICONS,
        shapes.bpmn2.Event.EVENT_ICONS
    );

    const theme = "material";
    let paper;
    let scroller;
    let ref;

    onMount(async () => {
        appendGraph();
    });

    /* 
        Append graph content
    */
    const appendGraph = () => {
        const { graph, focusPoint } = tabs[index];

        paper = new dia.Paper({
            model: graph,
            background: {
                color: "#F8F9FA",
            },
            frozen: true,
            async: true,
            gridSize: 10,
            cellViewNamespace: shapes,
            defaultConnectionPoint: { name: "boundary" },
        });

        scroller = new ui.PaperScroller({
            paper,
            baseWidth: 10,
            baseHeight: 10,
            autoResizePaper: true,
            contentOptions: {
                minWidth: 600,
                allowNewOrigin: "any",
                allowNegativeBottomRight: true,
                useModelGeometry: true,
                padding: 100,
            },
            cursor: "grab",
        });

        ref.appendChild(scroller.el);
        scroller.render().adjustPaper();

        paper.on("element:link", (elementView, evt) => {
            const { subgraphId } = elementView.model.attributes;
            if (!subgraphId) return;
            evt.stopPropagation();
            selectGraph(subgraphId);
        });

        paper.on("blank:pointerdown", (evt) => {
            scroller.startPanning(evt);
        });

        paper.on("blank:pointerup", () => {
            const focusPoint = scroller.getVisibleArea().center().toJSON();
            updateFocusPoint(focusPoint);
        });

        graph.getElements().forEach((element) => {
            HyperlinkHighlighter.addToLabel(element, paper, "subgraphId");
        });

        if (focusPoint) {
            scroller.center(focusPoint.x, focusPoint.y);
        } else {
            scroller.center();
        }

        paper.unfreeze();
    };

    /* 
        Select a tab by its graph Id
    */
    const selectGraph = (graphId) => {
        const index = tabs.findIndex((tab) => tab.graph.id === graphId);
        if (index > -1) {
            updateTabByIndex(index);
        } else {
            const message = new ui.FlashMessage({
                theme,
                content: `Invalid sub-process ID: ${graphId}`,
            });
            message.open();
        }
    };

    /* 
        Update ui.PaperScroller focusPoint
    */
    const updateFocusPoint = (point) => {
        tabStore.update((store) => {
            store[index].focusPoint = point;
            return store;
        });
    };
</script>

<div bind:this={ref} class="wrapper" />
