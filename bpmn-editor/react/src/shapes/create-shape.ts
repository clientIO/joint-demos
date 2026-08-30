import type { dia } from '@joint/plus';
import type { AppShape } from './shapes-typing';

/**
 * Creates a shape of the given type from the graph's cell namespace — the
 * one place that turns a type string into a model.
 *
 * Callers that need a narrower type say so: `createShape<AppElement>(...)`.
 */
export function createShape<T extends AppShape = AppShape>(
    graph: dia.Graph,
    type: string,
    attributes?: dia.Cell.Attributes
): T {
    const Constructor = graph.getTypeConstructor(type);

    if (!Constructor) {
        throw new Error(`No shape registered for the type "${type}".`);
    }

    return new Constructor(attributes) as T;
}

/**
 * The palette metadata a shape class carries (used by the stencil buttons
 * and the inspector's shape list). Declared as statics on the class, so
 * they are read off the constructor rather than an instance.
 */
export function getShapeMeta(graph: dia.Graph, type: string): { label: string, icon?: string } {
    const Constructor = graph.getTypeConstructor(type) as unknown as { label?: string, icon?: string } | undefined;

    return {
        label: Constructor?.label ?? type,
        icon: Constructor?.icon
    };
}
