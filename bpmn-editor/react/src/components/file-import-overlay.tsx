import type { Ref } from 'react';

// Drop overlay shown while a file is dragged over the paper —
// `setupFileImport` toggles its `active` class.
export function FileImportOverlay({ ref }: { ref: Ref<HTMLDivElement> }) {
    return (
        <div ref={ref} className="file-import-overlay">
            <div className="file-import-overlay-content">
                <svg
                    className="drop-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
                </svg>
                <h2 className="headline">Drop your BPMN diagram</h2>
                <p className="subline">Supported: <code>.bpmn</code>, <code>.xml</code>, <code>.json</code></p>
            </div>
        </div>
    );
}
