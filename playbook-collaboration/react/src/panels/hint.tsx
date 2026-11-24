/**
 * The first-run coach mark: the board's gestures in one sentence, gone once this
 * person has added a card.
 */
import { useMyProfile } from '@/presence';
import { useUiState } from '@/ui-state';

/** The hint at the bottom of the board. */
export function Hint() {
    const hasJoined = useMyProfile().seat >= 0;
    const hasAddedCard = useUiState((state) => state.hasAddedCard);
    if (!hasJoined || hasAddedCard) return null;
    return (
        <div
            className="absolute bottom-[70px] left-1/2 max-w-[520px] -translate-x-1/2 rounded-xl border border-edge bg-panel px-4 py-2 text-[12.5px] leading-normal shadow-plate"
            role="note"
        >
            <strong>Make it yours:</strong> drag a kind from the Cards rail, or double-click anywhere, to add a card for
            your department. Drag from a card's right dot to another card's left dot to draw a flow, double-click a card to
            rename it, drag the handles of a selected card to resize it, and click a flow to remove it.
        </div>
    );
}
