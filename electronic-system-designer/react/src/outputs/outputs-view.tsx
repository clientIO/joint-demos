// The Outputs view — every engineering document the design generates, live:
// the BOM first (the one document production actually needs), connector
// pinouts (with the connector face), wire list, netlist, connection matrix,
// overview readouts, and the design suggestions; plus the status rail and
// CSV/JSON export.
//
// Nothing here is stored. Every table derives from the same Design the
// canvases edit, so the documents are correct the moment an edit lands.

import { useMemo, type ReactNode } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { FindingFixButton } from '@/components/finding-fix-button';
import { Button } from '@/components/ui/button';
import { useAnnouncer } from '@/components/ui/announcer-context';
import { getPart } from '@/model/catalog';
import {
    bomToCsv,
    deriveBom,
    deriveConnectionMatrix,
    deriveConnectorPinouts,
    deriveNetlistText,
    deriveReleaseCheck,
    deriveWireList,
    designToJson,
    matrixToCsv,
    pinoutsToCsv,
    wireListToCsv,
} from '@/model/outputs';
import { useDesignerStore } from '@/state/designer-store';
import { PartSymbol } from '@/symbols/part-symbol';

// --- Small building blocks -------------------------------------------------

/** Browser download of a generated text document. */
function download(filename: string, text: string, mime: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    // Revoke on the next tick — a synchronous revoke can abort the download in
    // Safari when several exports fire back to back.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

const TH = 'text-tag border-b border-border px-2 py-1.5 text-left text-muted-foreground';
const TD = 'border-b border-border/60 px-2 py-1 font-mono text-xs';

function SectionTitle({ id, children }: { readonly id: string; readonly children: ReactNode }) {
    return (
        <h3 id={id} className="text-tag scroll-mt-4 pb-2 text-muted-foreground">
            {children}
        </h3>
    );
}

function StatusChip({ status }: { readonly status: 'assigned' | 'review' }) {
    return (
        <span
            className={`chamfer px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide [--chamfer:4px] ${
                status === 'assigned' ? 'bg-status-success/15 text-status-success' : 'bg-status-warning/15 text-status-warning'
            }`}
        >
            {status}
        </span>
    );
}

// --- Sections --------------------------------------------------------------

// BOM leads: it is the one document an engineer takes straight to
// purchasing and production — the rest supports it.
const SECTIONS = [
    { id: 'bom', label: 'BOM' },
    { id: 'pinouts', label: 'Connector pinouts' },
    { id: 'wires', label: 'Wire list' },
    { id: 'netlist', label: 'Netlist' },
    { id: 'matrix', label: 'Connection matrix' },
    { id: 'overview', label: 'Overview' },
    { id: 'suggestions', label: 'Suggestions' },
] as const;

export function OutputsView() {
    const design = useDesignerStore((state) => state.design);
    const nets = useDesignerStore((state) => state.nets);
    const findings = useDesignerStore((state) => state.findings);
    const trace = useDesignerStore((state) => state.trace);
    const announce = useAnnouncer();

    // All documents derive together; memoized on the inputs that shape them.
    const documents = useMemo(
        () => ({
            bom: deriveBom(design, findings),
            pinouts: deriveConnectorPinouts(design, nets),
            wireList: deriveWireList(design, nets),
            netlist: deriveNetlistText(design, nets),
            matrix: deriveConnectionMatrix(design, nets),
            release: deriveReleaseCheck(design, findings),
        }),
        [design, nets, findings],
    );
    const connectorCount = useMemo(
        () => design.components.filter((component) => getPart(component.part).refPrefix === 'J').length,
        [design],
    );

    const exportCsv = (): void => {
        download('sensor-gateway-bom.csv', bomToCsv(documents.bom), 'text/csv');
        download('sensor-gateway-wire-list.csv', wireListToCsv(documents.wireList), 'text/csv');
        download('sensor-gateway-pinouts.csv', pinoutsToCsv(documents.pinouts), 'text/csv');
        download('sensor-gateway-connection-matrix.csv', matrixToCsv(documents.matrix), 'text/csv');
        announce('Exported BOM, wire list, pinouts, and connection matrix as CSV');
    };
    const exportNetlist = (): void => {
        download('sensor-gateway.net', documents.netlist, 'text/plain');
        announce('Exported the netlist');
    };
    const exportJson = (): void => {
        download('sensor-gateway-design.json', designToJson(design, nets, findings), 'application/json');
        announce('Exported the design package as JSON');
    };

    return (
        <div className="flex size-full min-h-0">
            {/* Section nav — in-page anchors, the document stays one scroll. */}
            <nav aria-label="Design outputs" className="hidden w-52 flex-none border-r border-border bg-card/60 p-3 md:block">
                <h2 className="text-tag pb-2 text-muted-foreground">Design outputs</h2>
                <ul className="flex flex-col gap-0.5">
                    {SECTIONS.map((section) => (
                        <li key={section.id}>
                            <a
                                href={`#${section.id}`}
                                className="chamfer block px-2 py-1.5 text-sm text-muted-foreground transition-colors [--chamfer:6px] hover:bg-accent hover:text-foreground"
                            >
                                {section.label}
                            </a>
                        </li>
                    ))}
                </ul>
                <h2 className="text-tag pb-2 pt-5 text-muted-foreground">Export</h2>
                <div className="flex flex-col gap-1.5">
                    <Button variant="outline" className="justify-start" onClick={exportCsv}>
                        <FileSpreadsheet className="size-4" aria-hidden /> CSV tables
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={exportNetlist}>
                        <FileText className="size-4" aria-hidden /> Netlist
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={exportJson}>
                        <FileJson className="size-4" aria-hidden /> JSON package
                    </Button>
                </div>
            </nav>

            {/* The document. */}
            <div className="min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex max-w-3xl flex-col gap-10 p-6">
                    <section aria-labelledby="bom">
                        <SectionTitle id="bom">Bill of materials</SectionTitle>
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className={TH}>Refs</th>
                                    <th className={TH}>Part</th>
                                    <th className={TH}>Footprint</th>
                                    <th className={TH}>Datasheet</th>
                                    <th className={TH}>Qty</th>
                                    <th className={TH}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.bom.map((row) => (
                                    <tr key={row.refs}>
                                        <td className={TD}>{row.refs}</td>
                                        <td className={`${TD} font-sans`}>{row.name}</td>
                                        <td className={TD}>{row.footprint}</td>
                                        <td className={TD}>
                                            {row.datasheet === '' ? (
                                                <span className="text-muted-foreground/50">—</span>
                                            ) : (
                                                <a
                                                    href={row.datasheet}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-link underline-offset-2 hover:underline"
                                                >
                          PDF ↗<span className="sr-only"> — {row.name} datasheet, opens in a new tab</span>
                                                </a>
                                            )}
                                        </td>
                                        <td className={`${TD} tabular-nums`}>{row.quantity}</td>
                                        <td className={TD}>
                                            <StatusChip status={row.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section aria-labelledby="pinouts">
                        <SectionTitle id="pinouts">Connector pinouts</SectionTitle>
                        <div className="flex flex-col gap-6">
                            {documents.pinouts.map((pinout) => {
                                const component = design.components.find((candidate) => candidate.id === pinout.componentId);
                                const part = component === undefined ? undefined : getPart(component.part);
                                return (
                                    <div key={pinout.ref} className="flex gap-4">
                                        {/* The connector face beside its table. */}
                                        {part === undefined ? null : (
                                            <svg
                                                viewBox={`-18 -18 ${part.size.width + 36} ${part.size.height + 36}`}
                                                className="esd-thumb h-28 w-24 flex-none text-symbol-ink max-sm:hidden [&_.esd-pin-name]:hidden [&_.esd-ref]:hidden"
                                                aria-hidden
                                                focusable={false}
                                            >
                                                <PartSymbol part={part} refLabel="" />
                                            </svg>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="pb-1.5 text-sm font-semibold">
                                                {pinout.ref} · {pinout.name}
                                                <span className="pl-2 font-mono text-xs font-normal text-muted-foreground">{pinout.footprint}</span>
                                            </p>
                                            <table className="w-full border-collapse text-left">
                                                <thead>
                                                    <tr>
                                                        <th className={TH}>Pin</th>
                                                        <th className={TH}>Name</th>
                                                        <th className={TH}>Net</th>
                                                        <th className={TH}>Type</th>
                                                        <th className={TH}>Destination</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pinout.rows.map((row) => (
                                                        <tr key={row.pinNumber}>
                                                            <td className={`${TD} tabular-nums`}>{row.pinNumber}</td>
                                                            <td className={TD}>{row.pinName}</td>
                                                            <td className={TD}>{row.net}</td>
                                                            <td className={`${TD} font-sans text-muted-foreground`}>{row.iface}</td>
                                                            <td className={TD}>{row.destination}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section aria-labelledby="wires">
                        <SectionTitle id="wires">Wire list ({documents.wireList.length})</SectionTitle>
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className={TH}>From</th>
                                    <th className={TH}>To</th>
                                    <th className={TH}>Net</th>
                                    <th className={TH}>Interface</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.wireList.map((row) => (
                                    <tr key={row.id}>
                                        <td className={TD}>{row.from}</td>
                                        <td className={TD}>{row.to}</td>
                                        <td className={TD}>{row.net}</td>
                                        <td className={`${TD} font-sans text-muted-foreground`}>{row.iface}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section aria-labelledby="netlist">
                        <SectionTitle id="netlist">Netlist</SectionTitle>
                        <pre className="overflow-x-auto border border-border bg-canvas p-3 font-mono text-xs leading-relaxed">
                            {documents.netlist}
                        </pre>
                    </section>

                    <section aria-labelledby="matrix">
                        <SectionTitle id="matrix">Connection matrix</SectionTitle>
                        <div className="overflow-x-auto">
                            <table className="border-collapse text-left">
                                <thead>
                                    <tr>
                                        <th className={TH}>
                                            <span className="sr-only">Part</span>
                                        </th>
                                        {documents.matrix.names.map((name) => (
                                            <th key={name} className={`${TH} text-center`}>
                                                {name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.matrix.names.map((name, row) => (
                                        <tr key={name}>
                                            <th scope="row" className={`${TH} border-b-border/60 font-sans normal-case`}>
                                                {name}
                                            </th>
                                            {documents.matrix.counts[row]?.map((count, column) => (
                                                <td
                                                    key={documents.matrix.names[column]}
                                                    className={`${TD} text-center tabular-nums ${count > 0 ? '' : 'text-muted-foreground/40'}`}
                                                >
                                                    {row === column ? '·' : count}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section aria-labelledby="overview">
                        <SectionTitle id="overview">Overview</SectionTitle>
                        <dl className="grid grid-cols-2 border border-border sm:grid-cols-4">
                            {(
                [
                    ['Components', design.components.length],
                    ['Connectors', connectorCount],
                    ['Nets', nets.nets.length],
                    ['Suggestions', findings.length],
                ] as const
                            ).map(([label, value], index) => (
                                <div key={label} className={`p-3 ${index > 0 ? 'border-l border-border' : ''}`}>
                                    <dt className="text-tag text-muted-foreground">{label}</dt>
                                    <dd className="mt-1 font-mono text-2xl tabular-nums">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        {trace === null ? null : (
                            <p className="mt-3 border border-border bg-secondary/40 p-2.5 text-xs">
                                <span className="text-tag text-muted-foreground">Net trace · </span>
                                <span className="font-mono font-semibold">{trace.netName}</span>
                                <span className="text-muted-foreground"> — {trace.wires.size} wires across {trace.subsystems.size} subsystems</span>
                            </p>
                        )}
                    </section>

                    <section aria-labelledby="suggestions">
                        <SectionTitle id="suggestions">Design suggestions</SectionTitle>
                        {/* Suggestions, not verdicts: the rule check reads the design the
                way a colleague would — the engineer decides what applies. */}
                        <p className="pb-3 text-xs leading-snug text-muted-foreground">
              What the built-in rule check would raise in a design review. Whether each one applies
              is the engineer's call — a value that looks off here can be right in the larger
              architecture.
                        </p>
                        {findings.length === 0 ? (
                            <p className="text-sm text-status-success">
                Nothing to raise: voltage levels, pin assignments, bus termination, net drivers,
                and protocols all check out.
                            </p>
                        ) : (
                        // data-focus-anchor: applying a fix removes the row holding the
                        // focused button; focus lands on the list, Tab reaches the next.
                            <ul className="flex flex-col gap-2" tabIndex={-1} data-focus-anchor="">
                                {findings.map((finding) => (
                                    <li
                                        key={finding.id}
                                        className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border border-border p-2.5 text-sm"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold">
                                                {finding.severity === 'error' ? 'Review' : 'Consider'} · {finding.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{finding.detail}</p>
                                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        nets: {finding.nets.join(', ') || '—'}
                                            </p>
                                        </div>
                                        {finding.fix === undefined ? null : (
                                            <div className="flex w-full max-w-72 sm:w-auto">
                                                <FindingFixButton finding={finding} />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            <ReleaseRail
                release={documents.release}
                onExport={() => {
                    exportCsv();
                    exportNetlist();
                    exportJson();
                }}
            />
        </div>
    );
}

// --- Release check rail ----------------------------------------------------

interface ReleaseRailProps {
  readonly release: ReturnType<typeof deriveReleaseCheck>;
  readonly onExport: () => void;
}

function CheckRow({ ok, children }: { readonly ok: boolean; readonly children: ReactNode }) {
    return (
        <li className="flex items-center gap-2 border border-border px-2.5 py-2 text-xs">
            <span
                aria-hidden
                className={`size-2 flex-none rounded-full ${ok ? 'bg-status-success' : 'bg-status-warning'}`}
            />
            {children}
        </li>
    );
}

function ReleaseRail({ release, onExport }: ReleaseRailProps) {
    const { connectivityOk, bomComplete, errorCount, warningCount, unwiredComponents } = release;
    const suggestions = errorCount + warningCount;
    // A checklist, not a score: no percentage decides whether the design is
    // done — open suggestions are the engineer's to weigh, and export is
    // always available.
    return (
        <aside aria-label="Design status" className="hidden w-60 flex-none border-l border-border bg-card/60 p-3 lg:block">
            <h2 className="text-tag pb-2 text-muted-foreground">Design status</h2>
            <ul className="flex flex-col gap-1.5">
                <CheckRow ok={connectivityOk}>
                    {connectivityOk ? 'Everything is wired' : `Unwired: ${unwiredComponents.join(', ')}`}
                </CheckRow>
                <CheckRow ok={bomComplete}>{bomComplete ? 'BOM has parts' : 'BOM is empty'}</CheckRow>
                <CheckRow ok={suggestions === 0}>
                    {suggestions === 0
                        ? 'No open suggestions'
                        : `${suggestions} open suggestion${suggestions === 1 ? '' : 's'}`}
                </CheckRow>
            </ul>
            <Button variant="primary" className="mt-4 w-full" onClick={onExport}>
                <Download className="size-4" aria-hidden /> Export design package
            </Button>
        </aside>
    );
}
