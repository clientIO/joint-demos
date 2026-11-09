/**
 * The last line of defense: if anything in the board throws while rendering (for
 * example data in an unexpected shape written by another browser), show a short
 * message with a reload button instead of a blank page.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { buttonClass } from './button-class';

interface BoardErrorBoundaryState {
    readonly hasError: boolean;
}

/** Catches render errors below it. React only offers this as a class component. */
export class BoardErrorBoundary extends Component<{ readonly children: ReactNode }, BoardErrorBoundaryState> {
    state: BoardErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): BoardErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // The repo lint allows warn, not error; it still lands in the console for debugging.
        console.warn('Playbook board crashed:', error, info.componentStack);
    }

    render(): ReactNode {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="flex flex-1 items-center justify-center p-6" role="alert">
                <div className="flex max-w-sm flex-col items-start gap-3 rounded-xl border border-edge bg-panel p-5 shadow-plate">
                    <p className="m-0 text-[13px] font-semibold text-ink">The board ran into a problem and stopped drawing.</p>
                    <button type="button" className={buttonClass('primary')} onClick={() => window.location.reload()}>
                        Reload the board
                    </button>
                </div>
            </div>
        );
    }
}
