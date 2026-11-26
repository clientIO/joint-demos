import { useId, useState, type ReactNode } from 'react';
import { THEME_COLORS } from './colors';

/*
 * The fields of the inspector and the settings: each commits a value (one undo step), shows `mixed` when the
 * selected shapes differ, and has its label.
 */

/** A field's label and control. */
export function Field({ label, children }: { readonly label: string; readonly children: (id: string) => ReactNode }) {
    const id = useId();
    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-muted">{label}</label>
            {children(id)}
        </div>
    );
}

/** A group of fields under a heading. */
export function FieldGroup({ title, children }: { readonly title: string; readonly children: ReactNode }) {
    return (
        <section className="grid gap-3 border-t border-rule pt-4 first:border-t-0 first:pt-0">
            <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
            {children}
        </section>
    );
}

interface TextFieldProps {
    readonly label: string;
    readonly value: string | undefined;
    readonly isMixed?: boolean;
    readonly isMultiline?: boolean;
    readonly placeholder?: string;
    /** Why the last value was refused. */
    readonly error?: string;
    readonly onCommit: (value: string) => void;
    readonly children?: ReactNode;
}

/** A text committed on blur or Enter (a multi-line one on blur): one undo step per edit. */
export function TextField({ label, value = '', isMixed = false, isMultiline = false, placeholder, error, onCommit, children }: TextFieldProps) {
    const commit = (next: string) => {
        if (next !== value) {
            onCommit(next);
        }
    };
    return (
        <Field label={label}>
            {(id) => (
                <>
                    <div className="flex gap-2">
                        {isMultiline ? (
                            <textarea id={id} key={value} defaultValue={value} rows={3} className="field min-h-20" placeholder={isMixed ? 'mixed' : placeholder} onBlur={(event) => commit(event.target.value)} />
                        ) : (
                            <input
                                id={id}
                                key={value}
                                defaultValue={isMixed ? '' : value}
                                aria-invalid={error !== undefined}
                                className="field"
                                placeholder={isMixed ? 'mixed' : placeholder}
                                onBlur={(event) => commit(event.target.value.trim())}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.currentTarget.blur();
                                    }
                                }}
                            />
                        )}
                        {children}
                    </div>
                    {error && <p role="alert" className="text-sm text-error">{error}</p>}
                </>
            )}
        </Field>
    );
}

interface NumberFieldProps {
    readonly label: string;
    readonly value: number | undefined;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly placeholder?: string;
    readonly onCommit: (value: number | undefined) => void;
}

/** A number committed on blur or Enter; empty - none. */
export function NumberField({ label, value, min, max, step, placeholder, onCommit }: NumberFieldProps) {
    return (
        <Field label={label}>
            {(id) => (
                <input
                    id={id}
                    key={String(value)}
                    type="number"
                    defaultValue={value ?? ''}
                    min={min}
                    max={max}
                    step={step}
                    placeholder={placeholder}
                    className="field"
                    onBlur={(event) => {
                        const text = event.target.value.trim();
                        const next = text === '' ? undefined : Number(text);
                        if (next !== value && (next === undefined || Number.isFinite(next))) {
                            onCommit(next);
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
            )}
        </Field>
    );
}

interface RangeFieldProps {
    readonly label: string;
    readonly value: number;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly unit?: string;
    readonly format?: (value: number) => string;
    readonly onCommit: (value: number) => void;
}

/** A slider: the value shown while dragged, committed once on release (one undo step). */
export function RangeField({ label, value, min, max, step, unit = '', format, onCommit }: RangeFieldProps) {
    const [draft, setDraft] = useState<number | null>(null);
    const shown = draft ?? value;
    const commit = () => {
        if (draft !== null && draft !== value) {
            onCommit(draft);
        }
        setDraft(null);
    };
    return (
        <Field label={`${label}: ${format ? format(shown) : `${shown}${unit}`}`}>
            {(id) => (
                <input id={id} type="range" min={min} max={max} step={step} value={shown} className="accent-accent" onChange={(event) => setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
            )}
        </Field>
    );
}

/** A switch. */
export function ToggleField({ label, value, isMixed = false, onCommit }: { readonly label: string; readonly value: boolean; readonly isMixed?: boolean; readonly onCommit: (value: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={value} ref={(input) => { if (input) { input.indeterminate = isMixed; } }} onChange={(event) => onCommit(event.target.checked)} className="size-4 accent-accent" />
            {label}
        </label>
    );
}

/** An option of a button group. */
export interface Choice<T extends string> {
    readonly value: T;
    readonly label: ReactNode;
    /** Its name, when the label is an icon. */
    readonly name?: string;
}

interface ButtonGroupProps<T extends string> {
    readonly label: string;
    readonly value: T | undefined;
    readonly choices: ReadonlyArray<Choice<T>>;
    readonly onCommit: (value: T) => void;
}

/** One of a few options, as a row of buttons. */
export function ButtonGroupField<T extends string>({ label, value, choices, onCommit }: ButtonGroupProps<T>) {
    return (
        <div className="grid gap-1.5" role="radiogroup" aria-label={label}>
            <span className="text-sm font-medium text-muted">{label}</span>
            <div className="flex flex-wrap gap-1">
                {choices.map((choice) => (
                    <button
                        key={choice.value}
                        type="button"
                        role="radio"
                        aria-checked={choice.value === value}
                        aria-label={choice.name}
                        title={choice.name}
                        className={`key h-8 px-2.5 text-sm ${choice.value === value ? 'key-primary' : ''}`}
                        onClick={() => onCommit(choice.value)}
                    >
                        {choice.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

interface SelectFieldProps<T extends string> {
    readonly label: string;
    readonly value: T | undefined;
    readonly choices: ReadonlyArray<{ readonly value: T; readonly label: string }>;
    readonly onCommit: (value: T) => void;
}

/** One of many options, as a select. */
export function SelectField<T extends string>({ label, value, choices, onCommit }: SelectFieldProps<T>) {
    return (
        <Field label={label}>
            {(id) => (
                <select id={id} className="field" value={value ?? ''} onChange={(event) => {
                    const next = choices.find((choice) => choice.value === event.target.value);
                    if (next) {
                        onCommit(next.value);
                    }
                }}>
                    {value === undefined && <option value="">mixed</option>}
                    {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
            )}
        </Field>
    );
}

interface ColorFieldProps {
    readonly label: string;
    /** The color set; none - Auto. */
    readonly value: string | undefined;
    readonly isMixed?: boolean;
    readonly swatches?: ReadonlyArray<readonly [name: string, color: string]>;
    /** Whether Auto (none of its own) can be picked. */
    readonly hasAuto?: boolean;
    readonly onCommit: (value: string | undefined) => void;
}

/** A color: Auto (the slashed swatch), a color of the theme, or any color. */
export function ColorField({ label, value, isMixed = false, swatches = THEME_COLORS, hasAuto = true, onCommit }: ColorFieldProps) {
    const swatch = 'size-7 rounded-md border border-rule-2 aria-checked:outline-2 aria-checked:outline-offset-1 aria-checked:outline-accent';
    return (
        <div className="grid gap-1.5" role="radiogroup" aria-label={label}>
            <span className="text-sm font-medium text-muted">{label}{isMixed ? ' (mixed)' : ''}</span>
            <div className="flex flex-wrap items-center gap-1.5">
                {hasAuto && (
                    <button type="button" role="radio" aria-checked={!isMixed && value === undefined} aria-label="Auto" title="Auto" className={`${swatch} bg-[linear-gradient(to_top_right,transparent_45%,var(--color-error)_45%,var(--color-error)_55%,transparent_55%)]`} onClick={() => onCommit(undefined)} />
                )}
                {swatches.map(([name, color]) => (
                    <button key={color} type="button" role="radio" aria-checked={!isMixed && value === color} aria-label={name} title={name} className={swatch} style={{ background: color }} onClick={() => onCommit(color)} />
                ))}
                <input type="color" aria-label={`${label}: any color`} title="Any color" className="size-7 cursor-pointer rounded-md border border-rule-2 bg-transparent" value={value?.startsWith('#') ? value : '#000000'} onChange={(event) => onCommit(event.target.value)} />
            </div>
        </div>
    );
}

/** The sides of a shape (a label, a control), as a cross of buttons around it. */
export function SideField({ label, value, onCommit }: { readonly label: string; readonly value: string | undefined; readonly onCommit: (side: 'top' | 'left' | 'right' | 'bottom') => void }) {
    const sides = [
        ['top', 'Top', 'col-start-2 row-start-1'],
        ['left', 'Left', 'col-start-1 row-start-2'],
        ['right', 'Right', 'col-start-3 row-start-2'],
        ['bottom', 'Bottom', 'col-start-2 row-start-3'],
    ] as const;
    const current = value ?? 'bottom';
    return (
        <div className="grid gap-1.5" role="radiogroup" aria-label={label}>
            <span className="text-sm font-medium text-muted">{label}</span>
            <div className="grid w-48 grid-cols-3 grid-rows-3 gap-1">
                {sides.map(([side, name, place]) => (
                    <button key={side} type="button" role="radio" aria-checked={current === side} className={`key h-7 px-1 text-xs ${place} ${current === side ? 'key-primary' : ''}`} onClick={() => onCommit(side)}>{name}</button>
                ))}
                <span className="col-start-2 row-start-2 rounded-sm border border-dashed border-rule-2" aria-hidden />
            </div>
        </div>
    );
}
