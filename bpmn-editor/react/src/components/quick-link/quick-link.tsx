import { useEffect, useState } from 'react';
import { useGraph, usePaper, usePaperScroller, useSelectionCollection, useOnKeyboardEvents } from '@joint/react-plus';
import { addEffect, removeEffect, EffectType } from '../../effects';
import { getShapeMeta } from '../../shapes/create-shape';
import { Sequence } from '../../shapes/flow/flow-shapes';
import { isSwimlane, prepareLinkReplacement } from '../../utils';
import { ShapePicker, PickerOverlay, type PickerItem } from '../shape-picker/shape-picker';

import type { dia } from '@joint/plus';
import { ShapeTypes, type AppElement, type AppLink, type AppShape } from '../../shapes/shapes-typing';

// Annotations, groups and pools go after the flow shapes: an annotation or
// a group is an artifact and a pool is the participant a shape already sits
// in, so all three are the rarer choice — the list leads with what is
// usually wanted.
const TRAILING_TYPES = [ShapeTypes.ANNOTATION, ShapeTypes.GROUP, ShapeTypes.POOL];

const rank = (element: AppElement) => {
    const at = TRAILING_TYPES.indexOf(element.get('shapeType'));
    return at === -1 ? 0 : at + 1;
};

/**
 * The shapes the source may legally connect to, in the order they read on
 * screen. The rule is the shape's own `validateConnection()` — the same one
 * the pointer path enforces through `bpmnValidateConnection`, so the
 * keyboard cannot draw a link the mouse would refuse.
 */
function getLinkTargets(graph: dia.Graph, source: AppElement): AppElement[] {
    return graph.getElements()
        // Pools are valid ends — a message flow runs between participants.
        // Lanes are not: their `validateConnection()` refuses outright.
        .filter((element): element is AppElement => element !== source && !isSwimlane(element))
        .filter((element) => (source as AppShape).validateConnection(element))
        .sort((a, b) => {
            const byKind = rank(a) - rank(b);
            if (byKind !== 0) return byKind;

            const from = a.position();
            const to = b.position();
            return from.x - to.x || from.y - to.y;
        });
}

// A shape reads as its own name where it has one, and as its kind where it
// does not — "Pays 15" rather than "Task", but "Task" rather than nothing.
function describe(graph: dia.Graph, element: AppElement): string {
    const named = element.attr(element.labelPath);
    const kind = getShapeMeta(graph, element.get('type')).label;
    return (typeof named === 'string' && named.trim()) ? named.trim() : kind;
}

/**
 * Draws a link between two shapes that already exist: `shift+cmd+enter`
 * lists what the selection may connect to — pools included, since a message
 * flow runs between participants — and picking one connects them.
 *
 * Renders nothing until it is opened.
 */
export function QuickLink() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const selection = useSelectionCollection();

    const [linking, setLinking] = useState<{ source: AppElement, targets: AppElement[], anchor: DOMRect } | null>(null);
    const [preview, setPreview] = useState<dia.Cell.ID | null>(null);

    const stop = () => {
        setLinking(null);
        setPreview(null);
    };

    useOnKeyboardEvents({
        // A lane keeps this key for inserting a lane (it cannot be linked
        // anyway — `Swimlane.validateConnection()` returns false), so this
        // only answers for the shapes and pools that can be a link source.
        'shift+command+enter shift+ctrl+enter': (evt: dia.Event) => {
            if (linking) return;

            const cells = selection.collection.toArray();
            if (cells.length !== 1) return;

            const [cell] = cells;
            if (!cell.isElement() || isSwimlane(cell)) return;

            const targets = getLinkTargets(graph, cell as AppElement);
            if (targets.length === 0) return;

            const anchor = paper?.findViewByModel(cell)?.el.getBoundingClientRect();
            if (!anchor) return;

            evt.preventDefault();
            setLinking({ source: cell as AppElement, targets, anchor });
        }
    });

    // Anything else the user starts drops the list, as with the shape list.
    useEffect(() => {
        if (!linking) return;

        const onPointerDown = (evt: Event) => {
            const target = evt.target as Element | null;
            if (target?.closest?.('.shape-picker')) return;
            stop();
        };

        const onRemove = (cell: dia.Cell) => {
            if (cell === linking.source || linking.targets.includes(cell as AppElement)) stop();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        graph.on('remove', onRemove);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            graph.off('remove', onRemove);
        };
    }, [linking, graph]);

    // Outline the shape the highlighted row refers to: two shapes can carry
    // the same name, and the list alone would not say which is which.
    useEffect(() => {
        if (!paper) return;

        removeEffect(paper, EffectType.LinkTarget);
        if (!preview) return;

        const cell = graph.getCell(preview);
        const view = cell && paper.findViewByModel(cell);
        if (!view) return;

        addEffect(view, EffectType.LinkTarget);
        paperScroller?.scrollToElement(cell as dia.Element, { animation: { duration: 120 }});

        return () => removeEffect(paper, EffectType.LinkTarget);
    }, [paper, paperScroller, graph, preview]);

    const connect = (targetId: string) => {
        const source = linking?.source;
        stop();

        const target = source && graph.getCell(targetId);
        if (!source || !target) return;

        const batchName = 'quick-link';
        graph.startBatch(batchName);

        const link = new Sequence({ source: { id: source.id }, target: { id: target.id }});
        graph.addCell(link);

        // The type follows from the endpoints — a sequence flow inside a
        // pool, a message flow between two.
        const resolved = prepareLinkReplacement(link as AppLink);
        if (resolved !== link) graph.syncCells([resolved], { async: false });

        graph.stopBatch(batchName);

        selection.collection.reset([resolved]);
    };

    if (!linking || !paper) return null;

    const items: PickerItem[] = linking.targets.map((target) => ({
        value: String(target.id),
        label: describe(graph, target),
        icon: <span className={getShapeMeta(graph, target.get('type')).icon} aria-hidden="true" />
    }));

    return (
        <PickerOverlay anchor={linking.anchor} placement="right">
            <ShapePicker
                label={`Connect ${describe(graph, linking.source)} to`}
                items={items}
                onPick={connect}
                onActive={setPreview}
                onCancel={() => {
                    stop();
                    // Back to the shape the list was opened from.
                    const view = paper.findViewByModel(linking.source);
                    (view?.el as SVGElement | undefined)?.focus?.();
                }}
            />
        </PickerOverlay>
    );
}
