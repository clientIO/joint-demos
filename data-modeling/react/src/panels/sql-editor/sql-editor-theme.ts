import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

// A single CodeMirror theme whose colors are all CSS variables, so it follows
// our design tokens and flips with dark/light automatically — no second theme.
// The syntax token colors are theme-aware (`--sql-*` in index.css): a fixed
// mid-luminance oklch can't clear WCAG 4.5:1 on BOTH the near-white and near-black
// `--card`, so each theme supplies its own (darker on light, brighter on dark).
const STRING_COLOR = 'var(--sql-string)';
const NUMBER_COLOR = 'var(--sql-number)';
const FUNCTION_COLOR = 'var(--sql-function)';

const editorTheme = EditorView.theme({
    '&': {
        color: 'var(--foreground)',
        backgroundColor: 'var(--card)',
        fontSize: '13px',
        borderRadius: 'var(--radius)',
    },
    '.cm-content': {
        caretColor: 'var(--primary)',
        fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        padding: '10px 0',
    },
    '.cm-scroller': {
        fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        lineHeight: '1.6',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--primary)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
        backgroundColor: 'color-mix(in oklch, var(--primary) 22%, transparent)',
    },
    '.cm-selectionMatch': {
        backgroundColor: 'color-mix(in oklch, var(--primary) 14%, transparent)',
    },
    '.cm-activeLine': {
        backgroundColor: 'color-mix(in oklch, var(--muted) 55%, transparent)',
    },
    '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--muted-foreground)',
        border: 'none',
        paddingLeft: '6px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        color: 'var(--muted-foreground)',
        minWidth: '2.2em',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'color-mix(in oklch, var(--muted) 55%, transparent)',
        color: 'var(--foreground)',
    },
    '.cm-foldPlaceholder': {
        backgroundColor: 'var(--muted)',
        border: 'none',
        color: 'var(--muted-foreground)',
    },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
        backgroundColor: 'color-mix(in oklch, var(--primary) 18%, transparent)',
        outline: '1px solid color-mix(in oklch, var(--primary) 45%, transparent)',
    },
    // Autocompletion (intellisense) popup — token-driven so it follows dark/light
    // instead of CodeMirror's default light popup (white on our dark card).
    '.cm-tooltip': {
        backgroundColor: 'var(--popover, var(--card))',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 8px 24px -8px color-mix(in oklch, black 45%, transparent)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
        fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        maxHeight: '14em',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
        color: 'var(--foreground)',
        padding: '2px 8px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'color-mix(in oklch, var(--primary) 22%, transparent)',
        color: 'var(--foreground)',
    },
    '.cm-completionIcon': { color: 'var(--muted-foreground)', paddingRight: '0.5em' },
    '.cm-completionLabel': { color: 'var(--foreground)' },
    '.cm-completionDetail': { color: 'var(--muted-foreground)', fontStyle: 'italic' },
    '.cm-completionMatchedText': {
        color: 'var(--primary)',
        textDecoration: 'none',
        fontWeight: '600',
    },
});

const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: 'var(--sql-keyword)', fontWeight: '600' },
    { tag: tags.operator, color: 'var(--muted-foreground)' },
    { tag: [tags.string, tags.special(tags.string)], color: STRING_COLOR },
    { tag: [tags.number, tags.bool, tags.null], color: NUMBER_COLOR },
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--muted-foreground)', fontStyle: 'italic' },
    { tag: [tags.typeName, tags.className], color: FUNCTION_COLOR },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: FUNCTION_COLOR },
    { tag: [tags.propertyName, tags.attributeName], color: 'var(--foreground)' },
    { tag: [tags.variableName, tags.name], color: 'var(--foreground)' },
    { tag: tags.punctuation, color: 'var(--muted-foreground)' },
]);

// Combined extension: token colors + editor chrome, both token-driven.
export const sqlEditorTheme: Extension = [
    editorTheme,
    syntaxHighlighting(highlightStyle),
];
