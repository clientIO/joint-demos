import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Overlay, useCells, type CellId, type CellRecord, type Computed } from '@joint/react-plus';
import { tagOf } from '../plant/plant';
import { readProperty, type TagValue } from '../plant/properties';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import type { ControlKind, ShapeData, ShapeSpec } from '../shapes/types';
import { DIMMED_CLASS } from './highlighters';
import { controlCornerOf, controlSizeOf } from './placement';
import { dimmedCellsStore, plantStore } from './run-state';
import { useStore, useStoreSelector } from './store';
import './runtime.css';

/*
 * The controls of the equipment in run mode: a checkbox starts or stops a pump (a motor, a burner, ...), Open /
 * Closed switches a valve or a breaker, a slider sets a control valve. HTML over the paper (`Overlay`), moved with
 * the element and scaled with the paper, but upright (not rotated with the element). A control changes nothing:
 * it sends a command to the plant, which answers with an update when it is done (the valve moved, the pump
 * started) - pending until then (5 s at most), as in a real SCADA system. Hidden for an element whose controls
 * are turned off (`controls: false`).
 */

// How long a command waits for the plant (ms): pending until the plant updates the property, or this long
const PENDING_TIMEOUT = 5000;
const PERCENT = 100;
const SLIDER_STEP = 25;

/** The ids of the elements with a control shown. */
function selectControlled(cells: ReadonlyArray<Computed<CellRecord>>): readonly CellId[] {
    return cells.flatMap((cell) => {
        if (cell.type !== 'element' || !isShapeData(cell.data) || cell.data.controls === false) {
            return [];
        }
        return specOf(cell.data.kind)?.control ? [cell.id] : [];
    });
}

/**
 * The controls of the elements of the diagram. While editing they are shown inert: dimmed, not focused, the
 * pointer through them to the element (to select it, to move it).
 */
export function PlantControls({ isInert = false }: { readonly isInert?: boolean }): ReactNode {
    const ids = useCells(selectControlled);
    return ids.map((id) => <ElementControl key={id} id={id} isInert={isInert} />);
}

interface ControlledElement {
    readonly spec: ShapeSpec;
    readonly kind: ControlKind;
    readonly data: ShapeData;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly angle: number;
}

function selectControlledElement(cell: Computed<CellRecord> | undefined): ControlledElement | null {
    if (!cell || cell.type !== 'element' || !isShapeData(cell.data)) {
        return null;
    }
    const spec = specOf(cell.data.kind);
    if (!spec?.control) {
        return null;
    }
    return {
        spec,
        kind: spec.control,
        data: cell.data,
        x: cell.position.x,
        y: cell.position.y,
        width: cell.size.width,
        height: cell.size.height,
        angle: cell.angle ?? 0,
    };
}

const isSameElement = (a: ControlledElement | null, b: ControlledElement | null) =>
    a === b || (a !== null && b !== null && a.data === b.data && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.angle === b.angle);

/** A command sent and not done yet. */
interface Pending {
    readonly property: string;
    readonly value: TagValue;
}

/**
 * A command of the operator, pending until the plant updates the property to the value asked for (or the time
 * is up: no plant, refused - the state as it is then).
 */
function useCommand(data: ShapeData): { readonly pending: Pending | null; readonly request: (property: string, value: TagValue) => void } {
    const [pending, setPending] = useState<Pending | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const plant = useStore(plantStore);
    const tag = tagOf(data);

    useEffect(() => {
        if (!plant || !pending || !tag) {
            return;
        }
        return plant.on('update', (message) => {
            if (message.tag === tag && message.property === pending.property && message.value === pending.value) {
                setPending(null);
            }
        });
    }, [plant, pending, tag]);

    useEffect(() => () => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
        }
    }, []);

    const request = (property: string, value: TagValue) => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        // Done already: nothing to wait for
        if (readProperty(data, property) === value) {
            setPending(null);
        } else {
            setPending({ property, value });
            timer.current = setTimeout(() => {
                timer.current = null;
                setPending(null);
            }, PENDING_TIMEOUT);
        }
        // A cell without an ID is not a part of the plant: nothing is sent.
        if (tag) {
            plant?.send(tag, property, value);
        }
    };

    return { pending, request };
}

/** The name of the element for screen readers (the control has no visible label): its ID, else its label. */
function elementNameOf(data: ShapeData): string {
    return tagOf(data) ?? data.label?.text ?? '';
}

function ElementControl({ id, isInert }: { readonly id: CellId; readonly isInert: boolean }) {
    // By `useCells`: a cell removed meanwhile resolves to none (`useCell` would throw).
    const element = useCells(id, selectControlledElement, isSameElement);
    // Its own state only: a change of the dimmed cells re-renders the controls it dims or brightens.
    const isDimmed = useStoreSelector(dimmedCellsStore, (dimmed) => dimmed.has(id));
    if (!element) {
        return null;
    }
    const { kind, spec, data, x, y, width, height, angle } = element;
    const corner = controlCornerOf(kind, { spec, data, size: { width, height }, angle });
    const size = controlSizeOf(kind);
    return (
        <Overlay x={x + corner.x} y={y + corner.y} scaleWithPaper wheelTransparent className={`scada-control${isDimmed ? ` ${DIMMED_CLASS}` : ''}${isInert ? ' scada-control-inert' : ''}`} style={{ width: size.width, height: size.height }}>
            <div inert={isInert} className="contents">
                {kind === 'power' && <PowerControl data={data} />}
                {kind === 'toggle' && <ToggleControl data={data} />}
                {kind === 'slider' && <SliderControl data={data} />}
            </div>
        </Overlay>
    );
}

interface ControlProps {
    readonly data: ShapeData;
}

/** A checkbox that runs or stops a pump (a motor, a beacon, ...): it shows the state asked for until the plant does it. */
function PowerControl({ data }: ControlProps) {
    const { pending, request } = useCommand(data);
    const isRunning = Boolean(readProperty(data, 'power'));
    return (
        <div className={`scada-control-checkbox${pending ? ' scada-control-pending' : ''}`}>
            <input
                className="scada-control-checkbox-input"
                type="checkbox"
                checked={pending ? Boolean(pending.value) : isRunning}
                aria-label={`${elementNameOf(data)} running`}
                aria-busy={pending ? true : undefined}
                onChange={(event) => request('power', event.target.checked)}
            />
        </div>
    );
}

const SWITCH_STATES = [[true, 'Open'], [false, 'Closed']] as const;

/** Open / Closed buttons of a valve (a breaker): the state it is in pressed, the state asked for pending. */
function ToggleControl({ data }: ControlProps) {
    const { pending, request } = useCommand(data);
    const isOpen = Boolean(readProperty(data, 'open'));
    return (
        <div className={`scada-control-switch${pending ? ' scada-control-pending' : ''}`} role="group" aria-label={elementNameOf(data)}>
            {SWITCH_STATES.map(([open, text]) => (
                <button
                    key={text}
                    type="button"
                    className={open ? 'scada-control-switch-on' : 'scada-control-switch-off'}
                    aria-pressed={isOpen === open}
                    data-pending={pending?.value === open ? true : undefined}
                    onClick={() => {
                        if (open !== isOpen) {
                            request('open', open);
                        }
                    }}
                >
                    {text}
                </button>
            ))}
        </div>
    );
}

/** How open a valve is, as a text: closed, open, or a part of it. */
function openingText(percent: number): string {
    if (percent === 0) {
        return 'Closed';
    }
    return percent === PERCENT ? 'Open' : `${percent}% open`;
}

/**
 * A slider that sets how much a control valve is open: moved, it shows the value (not following the valve);
 * released, it sends the command and stays there until the plant moves the valve.
 */
function SliderControl({ data }: ControlProps) {
    const { pending, request } = useCommand(data);
    const [moving, setMoving] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const opening = Number(readProperty(data, 'open') ?? 0);
    const asked = pending ? Number(pending.value) : null;
    const value = moving ?? asked ?? opening;

    // Released (the native `change`, not React's `onChange` - the `input` of every move): the command sent
    const latestRequest = useRef(request);
    useEffect(() => {
        latestRequest.current = request;
    });
    useEffect(() => {
        const input = inputRef.current;
        if (!input) {
            return;
        }
        const onRelease = () => {
            setMoving(null);
            latestRequest.current('open', Number(input.value));
        };
        input.addEventListener('change', onRelease);
        return () => input.removeEventListener('change', onRelease);
    }, []);

    let text = openingText(opening);
    if (moving !== null) {
        text = openingText(moving);
    } else if (asked !== null) {
        text = `→ ${openingText(asked)}`;
    }
    return (
        <div className={`scada-control-slider${pending ? ' scada-control-pending' : ''}`}>
            <input
                ref={inputRef}
                className="scada-control-slider-input"
                type="range"
                min={0}
                max={PERCENT}
                step={SLIDER_STEP}
                value={value}
                aria-label={`${elementNameOf(data)} opening`}
                aria-valuetext={openingText(value)}
                onChange={(event) => setMoving(Number(event.target.value))}
            />
            <output className="scada-control-slider-output">{text}</output>
        </div>
    );
}
