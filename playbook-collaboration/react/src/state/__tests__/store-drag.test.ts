import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import type { CardNode } from '@/model/types';

/**
 * Dragging is a two-phase contract with the controlled `cells` echo:
 *
 * - `moveNode` (every pointermove) must store the model position VERBATIM.
 *   Any correction here is echoed back into the graph mid-drag and fights
 *   the pointer — the "card weirdly jumps" bug.
 * - `settleNode` (pointerup) owns the rules: round to integers and rest the
 *   presence.
 */

const MEMBER = { id: 'm-test', person: 'Tess', seat: 0 };

function seedCard(node: CardNode): void {
    useStore.setState((state) => ({
        joined: true,
        myId: MEMBER.id,
        members: { [MEMBER.id]: MEMBER },
        nodes: { ...state.nodes, [node.id]: node },
    }));
}

function card(overrides: Partial<CardNode>): CardNode {
    return {
        id: 'n-drag',
        kind: 'step',
        title: 'Enrich the record',
        subtitle: 'Company size, funding and tooling',
        x: 40,
        y: 170,
        owner: MEMBER.id,
        ...overrides,
    };
}

describe('drag without jumping', () => {
    beforeEach(() => {
        useStore.setState({ nodes: {}, flows: {}, members: {}, feed: [] });
    });

    it('moveNode stores the dragged position verbatim (no clamp, no round)', () => {
        seedCard(card({}));
        useStore.getState().moveNode('n-drag', 890.5, 300.25);
        const node = useStore.getState().nodes['n-drag'];
        expect(node.x).toBe(890.5);
        expect(node.y).toBe(300.25);
    });

    it('moveNode flags my presence as moving that card', () => {
        seedCard(card({}));
        useStore.getState().moveNode('n-drag', 100, 100);
        expect(useStore.getState().me.moving).toBe('n-drag');
        expect(useStore.getState().me.doing).toBe('moving');
    });

    it('settleNode rounds the position and rests the presence on release', () => {
        seedCard(card({}));
        useStore.getState().moveNode('n-drag', 890.5, 300.25);
        useStore.getState().settleNode('n-drag');
        const state = useStore.getState();
        expect(state.nodes['n-drag'].x).toBe(891);
        expect(state.nodes['n-drag'].y).toBe(300);
        expect(state.me.moving).toBeNull();
        expect(state.me.doing).toBe('idle');
    });
});
