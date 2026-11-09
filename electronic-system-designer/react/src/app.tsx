// App shell. Each canvas view is its own <Diagram> (graph + CONTROLLED
// cells derived from the store); the Outputs view is plain React. The header
// tabs switch which one is mounted — nothing is lost across switches because
// every piece of state lives in the zustand store, not in the canvases.

import { useEffect } from 'react';
import { useDesignerStore } from '@/state/designer-store';
import { AnnouncerProvider } from '@/components/ui/announcer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArchitectureCanvas, ConnectivityCanvas } from '@/canvas/canvas';
import { OutputsView } from '@/outputs/outputs-view';
import { Toolbar } from '@/toolbar/toolbar';

/** Global undo/redo keys (⌘Z / ⌘⇧Z, Ctrl on Windows). History is DOMAIN
 * level, so the binding lives at app scope — it works in every view. Text
 * fields keep their native editing undo. */
function useHistoryKeys() {
    const undo = useDesignerStore((state) => state.undo);
    const redo = useDesignerStore((state) => state.redo);
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
            const target = event.target;
            if (
                target instanceof HTMLElement &&
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)
            ) {
                return;
            }
            event.preventDefault();
            if (event.shiftKey) redo();
            else undo();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undo, redo]);
}

/** Where keyboard focus goes when the element holding it disappears: a fix
 * button removes its own suggestion row, "Remove" unmounts the properties
 * card, a dismissed toast takes its button with it, Enter on a subsystem
 * block swaps the whole canvas. Browsers drop such focus on <body> without a
 * word, so one document-level observer catches it and hands focus to the
 * nearest surviving `data-focus-anchor` the element sat in — a keyed remount
 * that keeps the id (the inspector's commit-on-Enter fields) gets its
 * replacement instead — else to the active canvas. */
function useFocusRescue() {
    useEffect(() => {
        let focused: Element | null = null;
        let anchors: readonly Element[] = [];
        const onFocusIn = (event: FocusEvent): void => {
            focused = event.target instanceof Element ? event.target : null;
            const chain: Element[] = [];
            for (let node = focused?.parentElement; node; node = node.parentElement) {
                if (node.hasAttribute('data-focus-anchor')) chain.push(node);
            }
            anchors = chain;
        };
        const rescue = (): void => {
            if (focused === null || (focused.isConnected && focused.checkVisibility())) return;
            const active = document.activeElement;
            if (active !== null && active !== document.body && active !== focused) return;
            const replacement = focused.id === '' ? null : document.getElementById(focused.id);
            const target =
        replacement ??
        anchors.find((anchor) => anchor.isConnected) ??
        document.querySelector('[role=\'application\']');
            focused = null;
            if (target instanceof HTMLElement || target instanceof SVGElement) target.focus();
        };
        const observer = new MutationObserver(rescue);
        observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener('focusin', onFocusIn);
        return () => {
            observer.disconnect();
            document.removeEventListener('focusin', onFocusIn);
        };
    }, []);
}

export function App() {
    const view = useDesignerStore((state) => state.view);
    useHistoryKeys();
    useFocusRescue();

    return (
        <AnnouncerProvider>
            <TooltipProvider>
                <div className="flex h-dvh flex-col overflow-hidden bg-background">
                    <Toolbar />
                    <main className="relative min-h-0 flex-1">
                        {/* Page heading for assistive tech — inside the landmark. The
                tabpanel is an INNER div: an explicit role on <main> itself
                would override the implicit `main` landmark. */}
                        <h1 className="sr-only">JointJS Electronic System Designer</h1>
                        <div
                            id={`panel-${view}`}
                            role="tabpanel"
                            aria-labelledby={`tab-${view}`}
                            className="size-full"
                        >
                            {view === 'architecture' ? <ArchitectureCanvas /> : null}
                            {view === 'connectivity' ? <ConnectivityCanvas /> : null}
                            {view === 'outputs' ? <OutputsView /> : null}
                        </div>
                    </main>
                </div>
            </TooltipProvider>
        </AnnouncerProvider>
    );
}
