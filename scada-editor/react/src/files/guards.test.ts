import { describe, expect, it } from 'vitest';
import { animationsOf, cellStyleOf, diagramStyleOf, favoritesOf, imageOf, imagesOf, labelOf, numberOf, validAttributesOf } from './guards';

describe('the guards of a file', () => {
    it('keeps the valid keys of a diagram style, drops the others', () => {
        expect(diagramStyleOf({ finish: 'flat', labelSize: 'huge', outlineWidth: 5, labels: 'tag', color: 7, canvas: '#fff', canvasGradient: 'yes' }))
            .toEqual({ finish: 'flat', labels: 'tag', canvas: '#fff' });
        expect(diagramStyleOf('not a style')).toEqual({});
        expect(diagramStyleOf({ labelSize: '__proto__', outlineWidth: 'toString' })).toEqual({});
    });

    it('keeps the valid keys of a cell style', () => {
        expect(cellStyleOf({ outlineWidth: 'thick', finish: 9, opacity: 7, lineWidth: 'thin', color: 'red' })).toEqual({ outlineWidth: 'thick', lineWidth: 'thin', color: 'red' });
        expect(cellStyleOf({ opacity: 0.5 })).toEqual({ opacity: 0.5 });
    });

    it('keeps the valid keys of a label', () => {
        expect(labelOf({ text: 42, position: 'diagonal', offset: 'x', size: -3, styles: 'italic', align: 'sideways' })).toEqual({});
        expect(labelOf({ text: 'Pump', position: 'top', offset: 10, size: 14, weight: 700, styles: ['italic', 'underline'], align: 'middle' }))
            .toEqual({ text: 'Pump', position: 'top', offset: 10, size: 14, weight: 700, styles: ['italic', 'underline'], align: 'middle' });
        expect(labelOf({ styles: ['bold'] })).toEqual({});
    });

    it('drops the invalid typed attributes of a shape, keeps the ones of its own kind', () => {
        expect(validAttributesOf({ flip: 'z', routing: 'zig', sourceArrowhead: 'bogus', tag: '', locked: 'no', unit: 'bar', plant: 3 })).toEqual({ unit: 'bar' });
        expect(validAttributesOf({ flip: 'xy', routing: 'smooth', targetArrowhead: 'open', tag: 'P-101', locked: true }))
            .toEqual({ flip: 'xy', routing: 'smooth', targetArrowhead: 'open', tag: 'P-101', locked: true });
    });

    it('accepts an image of a data URL of an image only', () => {
        const png = 'data:image/png;base64,AAAA';
        expect(imageOf('a', { href: png, width: '10', height: 20 })).toEqual({ href: png, width: 10, height: 20, name: 'a' });
        expect(imageOf('a', { href: 'https://example.com/x.png', width: 10, height: 10 })).toBeUndefined();
        expect(imageOf('a', { href: 'data:text/html;base64,AAAA', width: 10, height: 10 })).toBeUndefined();
        expect(imageOf('a', { href: png, width: 0, height: 10 })).toBeUndefined();
        expect(Object.keys(imagesOf({ good: { href: png, width: 1, height: 1 }, bad: { href: 'javascript:alert(1)', width: 1, height: 1 } }))).toEqual(['good']);
    });

    it('reads the numbers, favorites and animation level of a file', () => {
        expect([numberOf('12'), numberOf(''), numberOf(Number.NaN), numberOf(Infinity), numberOf(3)]).toEqual([12, undefined, undefined, undefined, 3]);
        expect(favoritesOf(['Pump', 3, null, 'Pipe'])).toEqual(['Pump', 'Pipe']);
        expect([animationsOf('alarms'), animationsOf('none'), animationsOf(undefined)]).toEqual(['alarms', 'full', 'full']);
    });
});
