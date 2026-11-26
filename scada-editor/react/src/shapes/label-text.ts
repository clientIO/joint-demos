import type { LabelContent } from './style';

/** A line of a label: its text, in bold (the ID above the name). */
export interface LabelLine {
    readonly text: string;
    readonly isBold: boolean;
}

/**
 * The lines of a shape's label: its name, its ID, or both - the ID in bold above the name - as the diagram shows
 * them. A shape without an ID shows its name; one without a name its ID.
 */
export function labelLinesOf(name: unknown, tag: unknown, content: LabelContent | undefined): readonly LabelLine[] {
    const nameLines = typeof name !== 'string' || name === '' ? [] : name.split('\n').map((text) => ({ text, isBold: false }));
    if (typeof tag !== 'string' || tag === '' || !content || content === 'name') {
        return nameLines;
    }
    if (content === 'tag') {
        return [{ text: tag, isBold: false }];
    }
    return [{ text: tag, isBold: true }, ...nameLines];
}

