import { describe, expect, it } from 'vitest';
import { createEscapeLayers } from './escape-layers';

describe('Escape', () => {
    it('closes the layer opened last, one a press; the diagram acts only when none is open', () => {
        const layers = createEscapeLayers();
        const pressed: string[] = [];
        layers.setFallback(() => pressed.push('level up'));
        const closeFind = layers.open(() => pressed.push('find'));
        const closeMenu = layers.open(() => pressed.push('menu'));
        layers.press();
        closeMenu();
        layers.press();
        closeFind();
        layers.press();
        expect(pressed).toEqual(['menu', 'find', 'level up']);
    });

    it('forgets a fallback replaced or removed', () => {
        const layers = createEscapeLayers();
        const pressed: string[] = [];
        const removeFirst = layers.setFallback(() => pressed.push('first'));
        layers.setFallback(() => pressed.push('second'));
        removeFirst();
        layers.press();
        expect(pressed).toEqual(['second']);
    });
});
