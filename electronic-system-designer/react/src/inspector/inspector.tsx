// The right panel: PROPERTIES for the selected cell on top — subsystem,
// component, wire (its net), or interface bundle — with the SUGGESTIONS
// below (the rule-check findings with their one-click "apply" fixes — hints
// for the engineer, never verdicts).
//
// Selection is read reactively from the diagram's selection collection (the
// react-plus hook made for it); everything else comes from the zustand store
// and writes back through store actions, so canvas, outputs, and this panel
// can never disagree.

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useCells, useSelectionCollection } from '@joint/react-plus';
import { ChevronDown, ChevronUp, CircleAlert, Locate, Trash2, TriangleAlert, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { FindingFixButton } from '@/components/finding-fix-button';
import { Button } from '@/components/ui/button';
import { useAnnouncer } from '@/components/ui/announcer-context';
import { getPart, IFACE_LABEL } from '@/model/catalog';
import { pinKey } from '@/model/design';
import { formatVolts, severityVerb, type Finding } from '@/model/validation';
import {
    useComponent,
    useDesignerStore,
    useSubsystem,
    type ViewId,
} from '@/state/designer-store';
import { parseBundleWireCellId } from '@/views/arch-cells';
import { boardBounds, parseFrameCellId } from '@/views/sch-cells';

const FIELD_LABEL = 'text-tag block pb-1 text-muted-foreground';
const FIELD_INPUT =
  'w-full border border-input bg-secondary px-2 text-sm text-foreground placeholder:text-muted-foreground';

// --- Problems --------------------------------------------------------------

function ProblemRow({ finding }: { readonly finding: Finding }) {
    const setTracedNet = useDesignerStore((state) => state.setTracedNet);
    const announce = useAnnouncer();
    const Icon = finding.severity === 'error' ? CircleAlert : TriangleAlert;
    const firstNet = finding.nets[0];

    return (
        <li className="border border-border bg-secondary/40 p-2" data-severity={finding.severity}>
            <div className="flex items-start gap-1.5">
                <Icon
                    className={
                        finding.severity === 'error' ? 'mt-0.5 size-3.5 flex-none text-destructive' : 'mt-0.5 size-3.5 flex-none text-status-warning'
                    }
                    aria-hidden
                />
                <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">
                        {finding.title}
                        <span className="sr-only">
                            {' '}— suggestion to {severityVerb(finding.severity)}
                        </span>
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{finding.detail}</p>
                </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
                {firstNet === undefined ? null : (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setTracedNet(firstNet);
                            announce(`Tracing net ${firstNet}`);
                        }}
                    >
                        <Locate className="size-3" aria-hidden /> Locate
                    </Button>
                )}
                <FindingFixButton finding={finding} />
            </div>
        </li>
    );
}

function ProblemsSection({ standalone }: { readonly standalone: boolean }) {
    const findings = useDesignerStore((state) => state.findings);
    if (findings.length === 0) {
        return (
            <p className="flex items-center gap-1.5 text-xs text-status-success">
                <span aria-hidden className="size-2 rounded-full bg-status-success" />
        No suggestions — nothing the rule check would raise.
            </p>
        );
    }
    return (
    // data-focus-anchor: a fix removes the row holding the focused button —
    // focus lands on this list, Tab reaches the next suggestion.
        <section aria-label={`Suggestions, ${findings.length}`} tabIndex={-1} data-focus-anchor="">
            {/* Standalone (no selection): the panel header already says
          "Suggestions" — repeating it here would stack three headings. */}
            {standalone ? null : (
                <h3 className="text-tag pb-1.5 text-muted-foreground">Suggestions ({findings.length})</h3>
            )}
            {/* The engineer decides: these are review hints, not blockers. */}
            <ul className="flex flex-col gap-1.5">
                {findings.map((finding) => (
                    <ProblemRow key={finding.id} finding={finding} />
                ))}
            </ul>
        </section>
    );
}

// --- Shared property bits --------------------------------------------------

function PropertyRow({ label, value }: { readonly label: string; readonly value: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2 text-sm">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-right font-mono text-xs">{value}</dd>
        </div>
    );
}

function NotesField({
    value,
    onChange,
}: {
  readonly value: string;
  readonly onChange: (notes: string) => void;
}) {
    return (
        <div>
            <label className={FIELD_LABEL} htmlFor="inspector-notes">
        Notes
            </label>
            <textarea
                id="inspector-notes"
                className={`${FIELD_INPUT} min-h-16 py-1.5`}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Engineering notes for this item"
            />
        </div>
    );
}

/** Enter opens a native <select>'s list the way Space and Alt+Down do — on a
 * keyboard, the one "activate" key is expected to work here too. */
function openPickerOnEnter(event: KeyboardEvent<HTMLSelectElement>): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    try {
        event.currentTarget.showPicker();
    } catch {
    // No showPicker (older engine) or not allowed here (cross-origin frame):
    // the native Space / Alt+Down path still opens the list.
    }
}

/** Board assignment select — boards are user-created data, so this doubles
 * as the "move to another board" control. */
function BoardSelect({
    id,
    value,
    onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (boardId: string) => void;
}) {
    const boards = useDesignerStore((state) => state.design.boards);
    return (
        <div>
            <label className={FIELD_LABEL} htmlFor={id}>
        Board
            </label>
            <div className="relative">
                <select
                    id={id}
                    className={`${FIELD_INPUT} h-8 appearance-none pr-7`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={openPickerOnEnter}
                >
                    {boards.map((board) => (
                        <option key={board.id} value={board.id}>
                            {board.name}
                        </option>
                    ))}
                </select>
                {/* The native arrow sits flush on the border; redrawn with room. */}
                <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
            </div>
        </div>
    );
}

/** One tappable net chip — clicking it traces the net across both views. */
function NetChip({ netId }: { readonly netId: string }) {
    const setTracedNet = useDesignerStore((state) => state.setTracedNet);
    const active = useDesignerStore((state) => state.trace?.netId === netId);
    const announce = useAnnouncer();
    return (
        <button
            type="button"
            onClick={() => {
                setTracedNet(active ? null : netId);
                announce(active ? 'Trace cleared' : `Tracing net ${netId}`);
            }}
            aria-pressed={active}
            className={`chamfer px-1.5 py-0.5 font-mono text-[11px] transition-colors [--chamfer:4px] ${
                active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent'
            }`}
        >
            {netId}
        </button>
    );
}

// --- Per-kind property cards -----------------------------------------------

/** The destructive action, at the bottom, spelled out (Backspace works too). */
function RemoveButton({ name, onRemove }: { readonly name: string; readonly onRemove: () => void }) {
    const { selectCells } = useSelectionCollection();
    const announce = useAnnouncer();
    return (
        <Button
            variant="danger"
            className="w-full"
            onClick={() => {
                onRemove();
                selectCells([]);
                announce(`${name} removed`);
            }}
        >
            <Trash2 className="size-3.5" aria-hidden /> Remove {name}
        </Button>
    );
}

function SubsystemCard({ id }: { readonly id: string }) {
    const subsystem = useSubsystem(id);
    const memberCount = useDesignerStore(
        (state) => state.design.components.filter((component) => component.subsystemId === id).length,
    );
    const renameSubsystem = useDesignerStore((state) => state.renameSubsystem);
    const setNotes = useDesignerStore((state) => state.setNotes);
    const openSubsystemDetail = useDesignerStore((state) => state.openSubsystemDetail);
    const removeSubsystem = useDesignerStore((state) => state.removeSubsystem);
    const setSubsystemBoard = useDesignerStore((state) => state.setSubsystemBoard);
    if (subsystem === undefined) return null;
    return (
        <div className="flex flex-col gap-3">
            <div>
                <label className={FIELD_LABEL} htmlFor="inspector-name">
          Subsystem name
                </label>
                <input
                    id="inspector-name"
                    className={`${FIELD_INPUT} h-8`}
                    value={subsystem.name}
                    onChange={(event) => renameSubsystem(id, event.target.value)}
                />
            </div>
            <BoardSelect
                id="inspector-subsystem-board"
                value={subsystem.board}
                onChange={(boardId) => setSubsystemBoard(id, boardId)}
            />
            <dl className="flex flex-col gap-1 border-y border-border py-2">
                <PropertyRow label="Components" value={memberCount} />
                <PropertyRow
                    label="Interfaces"
                    value={[...new Set(subsystem.ports.map((port) => IFACE_LABEL[port.iface]))].join(', ')}
                />
            </dl>
            <NotesField value={subsystem.notes ?? ''} onChange={(notes) => setNotes({ subsystem: id }, notes)} />
            <Button variant="outline" className="w-full" onClick={() => openSubsystemDetail(id)}>
        Open detailed connectivity
            </Button>
            <RemoveButton name={subsystem.name} onRemove={() => removeSubsystem(id)} />
        </div>
    );
}

function ComponentCard({ id }: { readonly id: string }) {
    const component = useComponent(id);
    const setNotes = useDesignerStore((state) => state.setNotes);
    const liveMode = useDesignerStore((state) => state.liveMode);
    const supply = useDesignerStore((state) => state.operating.supplyVolts.get(id));
    const netByPin = useDesignerStore((state) => state.nets.byPin);
    const removeComponent = useDesignerStore((state) => state.removeComponent);
    const setComponentBoard = useDesignerStore((state) => state.setComponentBoard);
    if (component === undefined) return null;
    const part = getPart(component.part);
    return (
        <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-1 border-b border-border pb-2">
                <PropertyRow label="Part" value={part.name} />
                <PropertyRow label="Footprint" value={part.footprint} />
                {part.datasheet === undefined ? null : (
                    <PropertyRow
                        label="Datasheet"
                        value={
                            <a
                                href={part.datasheet}
                                target="_blank"
                                rel="noreferrer"
                                className="text-link underline-offset-2 hover:underline"
                            >
                PDF ↗<span className="sr-only"> — {part.name} datasheet, opens in a new tab</span>
                            </a>
                        }
                    />
                )}
                {supply === undefined ? null : (
                    <PropertyRow label={liveMode ? 'Supply (animated)' : 'Supply'} value={formatVolts(supply)} />
                )}
                {part.currentMa === undefined ? null : <PropertyRow label="Typical draw" value={`${part.currentMa} mA`} />}
            </dl>
            <BoardSelect
                id="inspector-component-board"
                value={component.board}
                onChange={(boardId) => setComponentBoard(id, boardId)}
            />
            <p className="text-xs leading-snug text-muted-foreground">{part.description}</p>
            <section aria-label="Pins">
                <h3 className="text-tag pb-1 text-muted-foreground">Pins</h3>
                <ul className="flex flex-col gap-0.5">
                    {part.pins.map((pin) => {
                        const net = netByPin.get(pinKey({ component: id, pin: pin.id }));
                        return (
                            <li key={pin.id} className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono">
                                    {pin.number === undefined ? pin.name : `${pin.number} · ${pin.name}`}
                                </span>
                                {net === undefined ? (
                                    <span className="text-muted-foreground">unconnected</span>
                                ) : (
                                    <NetChip netId={net.id} />
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
            <NotesField value={component.notes ?? ''} onChange={(notes) => setNotes({ component: id }, notes)} />
            <RemoveButton name={component.ref} onRemove={() => removeComponent(id)} />
        </div>
    );
}

function WireCard({ id }: { readonly id: string }) {
    const net = useDesignerStore((state) => state.nets.byWire.get(id));
    const volts = useDesignerStore((state) => {
        const own = state.nets.byWire.get(id);
        return own === undefined ? undefined : state.operating.netVolts.get(own.id);
    });
    const components = useDesignerStore((state) => state.design.components);
    const renameNet = useDesignerStore((state) => state.renameNet);
    const announce = useAnnouncer();
    if (net === undefined) return null;
    const commitName = (raw: string): void => {
        const value = raw.trim();
        if (value === '' || value === net.name) return;
        renameNet(net.id, value);
        announce(`Net renamed to ${value}`);
    };
    return (
        <div className="flex flex-col gap-3">
            {/* Net NAMING: rename on commit (blur / Enter), not per keystroke —
          the name is also the net's identity across views and outputs. Enter
          commits IN PLACE: blurring would drop keyboard focus on <body>. */}
            <div>
                <label className={FIELD_LABEL} htmlFor="inspector-net-name">
          Net name
                </label>
                <input
                    id="inspector-net-name"
                    key={net.id}
                    className={`${FIELD_INPUT} h-8 font-mono`}
                    defaultValue={net.name}
                    onBlur={(event) => commitName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') commitName(event.currentTarget.value);
                    }}
                />
            </div>
            <dl className="flex flex-col gap-1 border-b border-border pb-2">
                <PropertyRow label="Net" value={<NetChip netId={net.id} />} />
                <PropertyRow label="Interface" value={IFACE_LABEL[net.iface]} />
                {net.iface === 'rs485' || net.iface === 'can' ? (
                    <PropertyRow
                        label="Signal"
                        value={
                            <span title="One half of a differential pair — route both lines together and terminate the pair at the far ends.">
                Differential pair
                            </span>
                        }
                    />
                ) : null}
                {volts === undefined ? null : <PropertyRow label="Level" value={formatVolts(volts)} />}
                <PropertyRow label="Connected pins" value={net.pins.length} />
            </dl>
            <ul className="flex flex-col gap-0.5" aria-label="Connected pins">
                {net.pins.map((pin) => {
                    const component = components.find((candidate) => candidate.id === pin.component);
                    return (
                        <li key={pin.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono">
                                {component?.ref ?? pin.component}·{pin.def.name}
                            </span>
                            <span className="text-muted-foreground">{getPart(component?.part ?? 'chassis').name}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function BundleCard({ id }: { readonly id: string }) {
    const bundle = useDesignerStore((state) => state.bundles.bundles.find((candidate) => candidate.id === id));
    const netByWire = useDesignerStore((state) => state.nets.byWire);
    const expanded = useDesignerStore((state) => state.expandedBundles.has(id));
    const toggleBundle = useDesignerStore((state) => state.toggleBundle);
    const announce = useAnnouncer();
    if (bundle === undefined) return null;
    const nets = [...new Set(bundle.wireIds.map((wireId) => netByWire.get(wireId)?.id).filter((netId) => netId !== undefined))];
    return (
        <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-1 border-b border-border pb-2">
                <PropertyRow label="Interface" value={IFACE_LABEL[bundle.iface]} />
                <PropertyRow label="Signals" value={nets.length} />
            </dl>
            <section aria-label="Member signals">
                <h3 className="text-tag pb-1 text-muted-foreground">Signals — click to trace</h3>
                <div className="flex flex-wrap gap-1">
                    {nets.map((netId) => (
                        <NetChip key={netId} netId={netId} />
                    ))}
                </div>
            </section>
            {bundle.wireIds.length > 1 ? (
            // Bus expansion/collapse (double-clicking the bundle does this too).
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        toggleBundle(id);
                        announce(expanded ? 'Bus collapsed' : 'Bus expanded into its signals');
                    }}
                >
                    {expanded ? 'Collapse bus' : 'Expand into signals'}
                </Button>
            ) : null}
        </div>
    );
}

/** A numeric outline dimension. Uncontrolled while focused (typing "400"
 * passes through "4"), committed on blur/Enter; the `key` remount picks up
 * external changes (drag-resize) whenever the field is not being edited.
 * Enter commits in place (no blur — that would drop focus on <body>); the
 * remount that follows keeps the id, so focus is handed to the new field. */
function SizeField({
    id,
    label,
    value,
    onCommit,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly onCommit: (value: number) => void;
}) {
    const commit = (raw: string): void => {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) onCommit(parsed);
    };
    return (
        <div className="flex-1">
            <label className={FIELD_LABEL} htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                key={value}
                type="number"
                min={80}
                step={20}
                className={`${FIELD_INPUT} h-8`}
                defaultValue={value}
                onBlur={(event) => commit(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') commit(event.currentTarget.value);
                }}
            />
        </div>
    );
}

/** Board outline properties — the keyboard path to what the canvas handles
 * do: rename, exact width/height, remove-when-empty. */
function BoardCard({ id }: { readonly id: string }) {
    const board = useDesignerStore((state) => state.design.boards.find((candidate) => candidate.id === id));
    const partCount = useDesignerStore(
        (state) => state.design.components.filter((component) => component.board === id).length,
    );
    const removable = useDesignerStore(
        (state) =>
            state.design.boards.length > 1 &&
      !state.design.components.some((component) => component.board === id),
    );
    // Primitive picks: bounds objects are rebuilt per commit (drag frames too).
    const [width, height] = useDesignerStore(
        useShallow((state) => {
            const bounds = boardBounds(state.design, id);
            return [Math.round(bounds?.width ?? 0), Math.round(bounds?.height ?? 0)] as const;
        }),
    );
    const renameBoard = useDesignerStore((state) => state.renameBoard);
    const setBoardSize = useDesignerStore((state) => state.setBoardSize);
    const removeBoard = useDesignerStore((state) => state.removeBoard);
    if (board === undefined) return null;
    return (
        <div className="flex flex-col gap-3">
            <div>
                <label className={FIELD_LABEL} htmlFor="inspector-board-name">
          Board name
                </label>
                <input
                    id="inspector-board-name"
                    className={`${FIELD_INPUT} h-8`}
                    value={board.name}
                    onChange={(event) => renameBoard(id, event.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <SizeField
                    id="inspector-board-width"
                    label="Width"
                    value={width}
                    onCommit={(value) => setBoardSize(id, { width: value, height })}
                />
                <SizeField
                    id="inspector-board-height"
                    label="Height"
                    value={height}
                    onCommit={(value) => setBoardSize(id, { width, height: value })}
                />
            </div>
            <dl className="flex flex-col gap-1 border-y border-border py-2">
                <PropertyRow label="Parts" value={partCount} />
            </dl>
            {removable ? <RemoveButton name={board.name} onRemove={() => removeBoard(id)} /> : null}
        </div>
    );
}

// --- The panel -------------------------------------------------------------

function SelectionCard({ cellId, view }: { readonly cellId: string; readonly view: ViewId }) {
    const isSubsystem = useDesignerStore((state) =>
        state.design.subsystems.some((subsystem) => subsystem.id === cellId),
    );
    const isComponent = useDesignerStore((state) =>
        state.design.components.some((component) => component.id === cellId),
    );
    const isWire = useDesignerStore((state) => state.design.wires.some((wire) => wire.id === cellId));
    if (isSubsystem) return <SubsystemCard id={cellId} />;
    if (isComponent) return <ComponentCard id={cellId} />;
    if (isWire) return <WireCard id={cellId} />;
    const boardId = parseFrameCellId(cellId);
    if (boardId !== undefined) return <BoardCard id={boardId} />;
    // Architecture links: an expanded member wire shows ITS net; a bundle its card.
    const member = parseBundleWireCellId(cellId);
    if (member !== null) return <WireCard id={member.wireId} />;
    if (view === 'architecture') return <BundleCard id={cellId} />;
    return null;
}

export function DesignerInspector({ view }: { readonly view: ViewId }) {
    const { collection, selectCells } = useSelectionCollection();
    // ID-ONLY selector: cell records are replaced on every attribute commit
    // (drag frames included), so subscribing to the records themselves would
    // re-render this panel per frame; the id is stable across a drag.
    const cellId = useCells(collection, (cells): string | undefined => {
        const single = cells.length === 1 ? cells[0] : undefined;
        return single !== undefined && typeof single.id === 'string' ? single.id : undefined;
    });
    const findingCount = useDesignerStore((state) => state.findings.length);
    // Small screens only: whether the bottom sheet is expanded (md+ ignores it).
    const [mobileOpen, setMobileOpen] = useState(false);
    // Subscribe to the resolved TITLE STRING, not the whole design — the design
    // object changes identity on every commit (60×/s during drags).
    const title = useDesignerStore((state) =>
        cellId === undefined
            ? 'Suggestions'
            : state.design.subsystems.find((candidate) => candidate.id === cellId)?.name ??
        state.design.components.find((candidate) => candidate.id === cellId)?.ref ??
        // A selected board outline titles as its board.
        state.design.boards.find((candidate) => candidate.id === parseFrameCellId(cellId))?.name ??
        // A wire (or an expanded bundle member) as its net, a bundle as its
        // label — the cell ids behind them are internal keys, not names.
        state.nets.byWire.get(parseBundleWireCellId(cellId)?.wireId ?? cellId)?.name ??
        state.bundles.bundles.find((candidate) => candidate.id === cellId)?.label ??
        cellId,
    );

    // The panel earns its screen space: shown while there is something to say.
    if (cellId === undefined && findingCount === 0) return null;

    return (
        <>
            {/* Small screens, collapsed: a compact bottom BAR instead of a sheet —
          the canvas stays the instrument; tap to expand. Purely user-driven
          (no auto-expand on select): the selection highlight + this bar's
          title already say what was picked. */}
            {mobileOpen ? null : (
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] absolute inset-x-2 bottom-2 z-20 flex min-h-10 items-center gap-2 bg-card px-3 py-1.5 text-left shadow-(--panel-shadow) md:hidden"
                >
                    <span className="text-tag flex-none text-muted-foreground">
                        {cellId === undefined ? 'Design review' : 'Properties'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
                    {findingCount > 0 ? (
                        <span className="flex flex-none items-center gap-1 font-mono text-xs text-muted-foreground">
                            <TriangleAlert className="size-3.5 text-status-warning" aria-hidden />
                            {findingCount}
                        </span>
                    ) : null}
                    <ChevronUp className="size-4 flex-none text-muted-foreground" aria-hidden />
                </button>
            )}
            <aside
                aria-label="Suggestions and properties"
                // data-focus-anchor: "Remove" and the close button both unmount the
                // control that was focused — focus lands on the panel.
                tabIndex={-1}
                data-focus-anchor=""
                // Desktop: floating right panel whose height stops above the
                // navigator cluster. Small screens: a bottom SHEET (expanded from the
                // bar above) — the canvas stays visible above it.
                className={`chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] absolute z-20 flex-col bg-card shadow-(--panel-shadow) max-md:inset-x-2 max-md:bottom-2 max-md:max-h-[46dvh] md:right-3 md:top-3 md:flex md:max-h-[calc(100%-14rem)] md:w-72 ${
                    mobileOpen ? 'flex' : 'max-md:hidden md:flex'
                }`}
            >
                <div className="flex items-start justify-between gap-2 p-3 pb-2">
                    <div>
                        <p className="text-tag text-muted-foreground">
                            {cellId === undefined ? 'Design review' : 'Properties'}
                        </p>
                        <h2 className="text-base font-semibold leading-tight">{title}</h2>
                    </div>
                    {/* Desktop: X only with a selection (it clears it). Mobile: always —
              it also collapses the sheet back to the bar. */}
                    <Button
                        size="icon"
                        aria-label={cellId === undefined ? 'Collapse panel' : 'Close properties'}
                        className={cellId === undefined ? 'md:hidden' : ''}
                        onClick={() => {
                            selectCells([]);
                            setMobileOpen(false);
                        }}
                    >
                        <X className="size-4" aria-hidden />
                    </Button>
                </div>
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-3 pt-0">
                    {cellId === undefined ? null : <SelectionCard cellId={cellId} view={view} />}
                    <ProblemsSection standalone={cellId === undefined} />
                </div>
            </aside>
        </>
    );
}
