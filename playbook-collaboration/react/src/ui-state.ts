/**
 * Local view state of this tab: what is selected, renamed or being connected.
 * It is never shared; the shared board lives in Liveblocks storage and the live
 * "who is doing what" lives in presence.
 */
import { create } from 'zustand';

interface UiState {
    /** The card the inspector shows. */
    readonly selectedCard: string | null;
    /** The flow selected on the board. */
    readonly selectedFlow: string | null;
    /** The first card of a click-click connection, waiting for the second click. */
    readonly connectFrom: string | null;
    /** The card whose title is being edited in place. */
    readonly renamingCard: string | null;
    /** Hides the first-run hint once this person has added a card. */
    readonly hasAddedCard: boolean;
}

/** Narrow selectors keep each component subscribed to just the field it shows. */
export const useUiState = create<UiState>(() => ({
    selectedCard: null,
    selectedFlow: null,
    connectFrom: null,
    renamingCard: null,
    hasAddedCard: false,
}));

/** Opens a card in the inspector; any flow selection or connect gesture ends. */
export function selectCard(cardId: string | null): void {
    useUiState.setState({ selectedCard: cardId, selectedFlow: null, connectFrom: null });
}

/** Selects a flow; the card selection ends. */
export function selectFlow(flowId: string): void {
    useUiState.setState({ selectedFlow: flowId, selectedCard: null, connectFrom: null });
}

/** Arms the click-click connect gesture from a card. */
export function startConnecting(cardId: string): void {
    useUiState.setState({ connectFrom: cardId });
}

/** Esc or a click on open ground: drop every selection and gesture. */
export function clearSelection(): void {
    useUiState.setState({ selectedCard: null, selectedFlow: null, connectFrom: null });
}

/** Opens or closes the in-place title editor. */
export function setRenamingCard(cardId: string | null): void {
    useUiState.setState({ renamingCard: cardId, connectFrom: null });
}
