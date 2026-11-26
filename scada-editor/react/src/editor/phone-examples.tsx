import { EXAMPLES, type Example } from '../files/examples';

/** A phone: narrow, or short (turned sideways) - a viewer of the examples, no room for the palette and the inspector. */
export const PHONE_QUERY = '(max-width: 640px), (max-height: 480px)';

/** The edit mode on a phone: a page of the examples over the canvas; the one picked runs. */
export function PhoneExamples({ onPick }: { readonly onPick: (example: Example) => void }) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col gap-2 overflow-auto bg-paper px-4 py-6">
            <h2 className="font-display text-lg font-semibold text-ink">Examples</h2>
            <p className="mb-2 text-sm text-muted">Run a plant: watch it, operate its equipment. Editing needs a larger screen.</p>
            {EXAMPLES.map((example) => (
                <button key={example.name} type="button" className="grid gap-1 rounded-lg border border-rule bg-paper-2 p-3 text-left hover:border-rule-2" onClick={() => onPick(example)}>
                    <span className="font-display font-semibold text-ink">{example.name}</span>
                    <span className="text-sm text-ink-2">{example.description}</span>
                </button>
            ))}
        </div>
    );
}
