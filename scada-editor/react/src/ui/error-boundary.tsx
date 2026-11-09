import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
    readonly error: Error | null;
}

/**
 * The last line of defense: a render error shows a message with a way back
 * instead of a blank page. (React offers error boundaries as classes only.)
 */
export class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // Kept in the console with the component stack, for whoever debugs it.
        console.warn(error, info.componentStack);
    }

    render(): ReactNode {
        if (!this.state.error) {
            return this.props.children;
        }
        return (
            <main className="grid h-full place-items-center bg-paper p-6 text-ink">
                <div className="grid max-w-md gap-3">
                    <h1 className="font-display text-xl font-semibold tracking-tight">The editor stopped</h1>
                    <p className="text-sm text-ink-2">{this.state.error.message}</p>
                    <button type="button" className="key justify-self-start" onClick={() => window.location.reload()}>
                        Reload the editor
                    </button>
                </div>
            </main>
        );
    }
}
