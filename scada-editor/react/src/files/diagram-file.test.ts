import { describe, expect, it } from 'vitest';
import { specOf } from '../shapes/registry';
import { EXAMPLES } from './examples';
import { DiagramFileError, diagramOfFile, fileOfDiagram, withUniqueTags } from './diagram-file';

type Model = Readonly<Record<string, unknown>>;

const cellsOf = (json: unknown): readonly Model[] => {
    if (typeof json !== 'object' || json === null || !('cells' in json) || !Array.isArray(json.cells)) {
        throw new Error('not a diagram');
    }
    return json.cells;
};

describe('the diagram file', () => {
    it.each(EXAMPLES.map((example) => [example.name, example.json] as const))('opens every cell of the %s example', (_name, json) => {
        const diagram = diagramOfFile(json);
        expect(diagram.cells.map((cell) => cell.id)).toEqual(cellsOf(json).map((model) => model.id));
    });

    it.each(EXAMPLES.map((example) => [example.name, example.json] as const))('saves the %s example as it was opened', (_name, json) => {
        const diagram = diagramOfFile(json);
        const saved = cellsOf(fileOfDiagram({ ...diagram, cells: diagram.cells }));
        cellsOf(json).forEach((model, index) => {
            // The look (`attrs`) of a cell is made from its kind: compared without it.
            const own = Object.fromEntries(Object.entries(model).filter(([key]) => key !== 'attrs'));
            expect(saved[index]).toMatchObject(own);
        });
    });

    it('refuses a file without cells before anything changes', () => {
        expect(() => diagramOfFile({ images: {} })).toThrow('no cells');
    });

    const pump = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: 'Pump', position: { x: 0, y: 0 }, ...extra });
    const pipe = (id: string, source: unknown, target: unknown) => ({ id, type: 'Pipe', source, target });

    it.each([
        ['a cell of a kind it does not know', { cells: [pump('a'), { id: 'b', type: 'Spaceship' }] }, 'Spaceship'],
        ['a cell without an id', { cells: [pump('a'), { type: 'Pump', position: { x: 0, y: 0 } }] }, 'no id'],
        ['two cells of one id', { cells: [pump('a'), pump('a')] }, 'two cells'],
        ['a link to a cell it does not have', { cells: [pump('a'), pipe('l', { id: 'a', port: 'out' }, { id: 'nope' })] }, 'nope'],
        ['a link end that is neither a cell nor a point', { cells: [pump('a'), pipe('l', { id: 'a' }, { x: 'q' })] }, 'neither'],
        ['a cell that is not an object', { cells: [pump('a'), 'Pump'] }, 'not an object'],
    ])('refuses a file with %s, whole', (_name, json, message) => {
        expect(() => diagramOfFile(json)).toThrow(DiagramFileError);
        expect(() => diagramOfFile(json)).toThrow(message);
    });

    it('opens the valid values of a file, its invalid ones dropped', () => {
        const diagram = diagramOfFile({
            cells: [
                pump('a', { label: { text: 42, position: 'diagonal' }, flip: 'z', style: { outlineWidth: 'mega' }, size: { width: 'abc' }, angle: 'x', position: { x: 'a' }, parent: 'missing' }),
                pump('b', { parent: 'b' }),
                pipe('l', { id: 'a' }, { x: 10, y: 20 }),
            ],
            style: { labelSize: 'huge', finish: 'flat' },
            animations: 'sometimes',
        });
        const [a, b, l] = diagram.cells;
        // Its kind's size for one that is not a size.
        expect(a.type === 'element' && { position: a.position, angle: a.angle, size: a.size, parent: a.parent }).toEqual({ position: { x: 0, y: 0 }, angle: 0, size: specOf('Pump')?.size, parent: undefined });
        expect(a.data?.flip).toBeUndefined();
        expect(a.data?.style).toEqual({});
        expect(a.data?.label?.text).toBe('Pump');
        expect(b.parent).toBeUndefined();
        expect(l.type === 'link' && l.target).toEqual({ x: 10, y: 20 });
        expect(diagram.style).toEqual({ finish: 'flat' });
        expect(diagram.animations).toBe('full');
    });

    it('gives a duplicate ID the next free one of its series (the first keeps it)', () => {
        const diagram = diagramOfFile({ cells: [pump('a', { tag: 'P-101' }), pump('b', { tag: 'P-101' }), pump('c', { tag: 'P-102' })] });
        expect(diagram.cells.map((cell) => cell.data?.tag)).toEqual(['P-101', 'P-103', 'P-102']);
        expect(withUniqueTags([{ data: { kind: 'Pump', tag: 'X' } }, { data: { kind: 'Pump', tag: 'X' } }]).map((cell) => cell.data.tag)).toEqual(['X', 'ID-101']);
    });
});


describe('a file with groups inside each other', () => {
    it('is refused', () => {
        const element = (id: string, parent: string) => ({ id, type: 'Group', position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, parent });
        expect(() => diagramOfFile({ cells: [element('a', 'b'), element('b', 'a')] })).toThrow('contain each other');
    });
});
