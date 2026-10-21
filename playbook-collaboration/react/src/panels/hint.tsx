import { useStore } from '@/state/store';

/**
 * First-run coach mark, gone the moment the member adds a card. Teaches the
 * three gestures in the tool's own voice.
 */
export function Hint() {
    const joined = useStore((state) => state.joined);
    const hasTouchedBoard = useStore((state) => {
        const mine = state.myId;
        return Object.values(state.nodes).some(
            (node) => node.owner === mine && !node.id.startsWith('n-seed-')
        );
    });
    if (!joined || hasTouchedBoard) return null;
    return (
        <div
            className="absolute bottom-[18px] left-1/2 max-w-[520px] -translate-x-1/2 rounded-xl border border-edge bg-panel px-4 py-2 text-[12.5px] leading-normal shadow-plate"
            role="note"
        >
            <strong>Make it yours:</strong> drag a kind from the Cards rail — or double-click
      anywhere — to add a card for your department. Drag from the out dot on a
      card’s right edge to the in dot of another to draw a flow, double-click a card to rename it, drag the handles of
      a selected card to resize it, and click a flow to remove it.
        </div>
    );
}
