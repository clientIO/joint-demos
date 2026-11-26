import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useGraph, useOnGraphEvents } from '@joint/react-plus';
import { ImagesContext } from '../shapes/images';
import { applyDiagramStyle, DiagramStyleContext } from '../shapes/style';
import { DiagramMetaContext, META_ATTRIBUTES, META_GUARDS, metaOfGraph, resetMeta, writeMeta, type DiagramMeta } from './diagram-meta';

/**
 * Provides the meta of the graph of the surrounding `<Diagram>`, following its attributes (an edit, an undo, an
 * opened diagram); the graph gets `initialMeta` when it is mounted. The style is applied to the document.
 */
export function DiagramMetaProvider({ initialMeta, children }: { readonly initialMeta: DiagramMeta; readonly children: ReactNode }) {
    const { graph } = useGraph();
    const [meta, setMeta] = useState(initialMeta);

    // The graph gets the first diagram's meta: its attributes are the source from then on.
    useLayoutEffect(() => {
        resetMeta(graph, initialMeta);
    }, [graph, initialMeta]);

    // Each key follows its attribute of the graph (not a cell's attribute of the same name: the graph's own).
    const isGraph = (model: unknown) => model === graph;
    useOnGraphEvents({
        [`change:${META_ATTRIBUTES.style}`]: (model: unknown) => isGraph(model) && setMeta((previous) => ({ ...previous, style: META_GUARDS.style(graph.get(META_ATTRIBUTES.style)) })),
        [`change:${META_ATTRIBUTES.images}`]: (model: unknown) => isGraph(model) && setMeta((previous) => ({ ...previous, images: META_GUARDS.images(graph.get(META_ATTRIBUTES.images)) })),
        [`change:${META_ATTRIBUTES.favorites}`]: (model: unknown) => isGraph(model) && setMeta((previous) => ({ ...previous, favorites: META_GUARDS.favorites(graph.get(META_ATTRIBUTES.favorites)) })),
        [`change:${META_ATTRIBUTES.animations}`]: (model: unknown) => isGraph(model) && setMeta((previous) => ({ ...previous, animations: META_GUARDS.animations(graph.get(META_ATTRIBUTES.animations)) })),
    });

    useEffect(() => {
        applyDiagramStyle(meta.style);
    }, [meta.style]);

    const updateMeta = (update: (previous: DiagramMeta) => DiagramMeta) => {
        const previous = metaOfGraph(graph);
        writeMeta(graph, previous, update(previous));
    };

    return (
        <DiagramMetaContext value={{ meta, updateMeta }}>
            <DiagramStyleContext value={meta.style}>
                <ImagesContext value={meta.images}>{children}</ImagesContext>
            </DiagramStyleContext>
        </DiagramMetaContext>
    );
}
