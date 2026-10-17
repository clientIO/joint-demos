/**
 * A read-only panel displaying a JSON document. Entries of the module ports,
 * cells and nets can be highlighted (e.g. to show the selected diagram node).
 */

export interface JsonPanelOptions {
    containerEl: HTMLElement;
    title?: string;
    /**
     * Show only the header of the panel (default: false).
     */
    collapsed?: boolean;
}

const INDENT = '  ';

/**
 * Paths of the entries which can be highlighted, e.g. `modules/top/cells/$and$1`.
 */
const ENTRY_PATH_REGEX = /^modules\/[^/]+\/(ports|cells|netnames)\/[^/]+$/;

export default class JsonPanel {

    el: HTMLElement;
    containerEl: HTMLElement;
    headerEl: HTMLElement;
    codeEl: HTMLElement;
    subtitleEl: HTMLElement;
    copyButtonEl: HTMLButtonElement;

    private json: unknown = null;
    private entries = new Map<string, HTMLElement>();
    private highlightedEl: HTMLElement | null = null;

    constructor(options: JsonPanelOptions) {
        const { containerEl, title = 'JSON', collapsed = false } = options;

        const el = document.createElement('div');
        el.classList.add('json-panel');
        el.innerHTML = /* html */`
            <div class="json-panel-header" role="button" tabindex="0">
                <span class="json-panel-toggle"></span>
                <div class="json-panel-title-wrapper">
                    <span class="json-panel-title"></span>
                    <span class="json-panel-subtitle"></span>
                </div>
                <button class="json-panel-copy" data-tooltip="Copy to clipboard" data-tooltip-position="bottom">Copy</button>
            </div>
            <pre class="json-panel-code"></pre>
        `;
        (el.querySelector('.json-panel-title') as HTMLElement).textContent = title;
        containerEl.appendChild(el);

        this.el = el;
        this.containerEl = containerEl;
        this.headerEl = el.querySelector('.json-panel-header') as HTMLElement;
        this.codeEl = el.querySelector('.json-panel-code') as HTMLElement;
        this.subtitleEl = el.querySelector('.json-panel-subtitle') as HTMLElement;
        this.copyButtonEl = el.querySelector('.json-panel-copy') as HTMLButtonElement;
        this.copyButtonEl.addEventListener('click', (evt) => {
            // Do not toggle the panel
            evt.stopPropagation();
            this.copyToClipboard();
        });

        // Clicking the header collapses / expands the panel
        this.headerEl.addEventListener('click', () => this.toggle());
        this.headerEl.addEventListener('keydown', (evt) => {
            if (evt.key !== 'Enter' && evt.key !== ' ') return;
            evt.preventDefault();
            this.toggle();
        });

        this.setCollapsed(collapsed);
    }

    isCollapsed(): boolean {
        return this.containerEl.classList.contains('collapsed');
    }

    setCollapsed(collapsed: boolean) {
        this.containerEl.classList.toggle('collapsed', collapsed);
        this.headerEl.setAttribute('aria-expanded', String(!collapsed));
        this.headerEl.dataset.tooltip = collapsed ? 'Show the JSON' : 'Hide the JSON';
        // Bring the highlighted entry into view when the panel is expanded
        if (!collapsed && this.highlightedEl) {
            this.highlight(this.highlightedEl.dataset.path || null);
        }
    }

    toggle() {
        this.setCollapsed(!this.isCollapsed());
    }

    /**
     * Render the given JSON document.
     */
    setJSON(json: unknown, subtitle = '') {
        const highlightedPath = this.highlightedEl?.dataset.path || null;
        this.json = json;
        this.subtitleEl.textContent = subtitle;
        this.codeEl.innerHTML = renderValue(json, '', []);
        this.entries.clear();
        this.codeEl.querySelectorAll<HTMLElement>('[data-path]').forEach(entryEl => {
            this.entries.set(entryEl.dataset.path!, entryEl);
        });
        this.highlightedEl = null;
        // Keep the current highlight
        this.highlight(highlightedPath, { scroll: false });
    }

    /**
     * Highlight the entry with the given path (or remove the highlight).
     */
    highlight(path: string | null, { scroll = true } = {}) {
        this.highlightedEl?.classList.remove('highlighted');
        this.highlightedEl = null;
        if (!path) return;
        const entryEl = this.entries.get(path);
        if (!entryEl) return;
        entryEl.classList.add('highlighted');
        this.highlightedEl = entryEl;
        if (scroll && !this.isCollapsed()) {
            const codeRect = this.codeEl.getBoundingClientRect();
            const entryRect = entryEl.getBoundingClientRect();
            this.codeEl.scrollTo({
                top: this.codeEl.scrollTop + entryRect.top - codeRect.top - 40,
                behavior: 'smooth'
            });
        }
    }

    copyToClipboard() {
        const text = JSON.stringify(this.json, null, 2);
        navigator.clipboard?.writeText(text).then(() => {
            this.copyButtonEl.textContent = 'Copied';
            setTimeout(() => {
                this.copyButtonEl.textContent = 'Copy';
            }, 1500);
        });
    }

    remove() {
        this.el.remove();
    }
}

/**
 * Pretty-print the JSON value as HTML.
 * Arrays of primitives (e.g. bits) are printed on a single line, as Yosys does.
 */
function renderValue(value: unknown, indent: string, path: string[]): string {
    if (value === null || typeof value !== 'object') {
        return renderPrimitive(value);
    }
    const innerIndent = indent + INDENT;
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        if (value.every(item => item === null || typeof item !== 'object')) {
            return `[ ${value.map(renderPrimitive).join(', ')} ]`;
        }
        const items = value.map((item, index) => innerIndent + renderValue(item, innerIndent, [...path, `${index}`]));
        return `[\n${items.join(',\n')}\n${indent}]`;
    }
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const entries = keys.map((key, index) => {
        const entryPath = [...path, key];
        const separator = index < keys.length - 1 ? ',' : '';
        const entryHTML = `${innerIndent}<span class="json-key">${escapeHTML(JSON.stringify(key))}</span>: ${renderValue((value as Record<string, unknown>)[key], innerIndent, entryPath)}${separator}`;
        const pathString = entryPath.join('/');
        if (ENTRY_PATH_REGEX.test(pathString)) {
            return `<span class="json-entry" data-path="${escapeHTML(pathString)}">${entryHTML}</span>`;
        }
        return entryHTML;
    });
    return `{\n${entries.join('\n')}\n${indent}}`;
}

function renderPrimitive(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return `<span class="json-string">${escapeHTML(JSON.stringify(value))}</span>`;
        case 'number':
            return `<span class="json-number">${value}</span>`;
        case 'boolean':
            return `<span class="json-boolean">${value}</span>`;
        default:
            return '<span class="json-null">null</span>';
    }
}

function escapeHTML(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
