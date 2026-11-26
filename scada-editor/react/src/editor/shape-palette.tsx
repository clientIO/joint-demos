import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown, Image as ImageIcon, Layers, Search, Star, Upload } from 'lucide-react';
import { useCells, useGraph, useStencil, type CellRecord, type Computed } from '@joint/react-plus';
import { CONNECTIONS, isConnectionKind, type ConnectionKind } from '../connections/connections';
import { footprintOf } from '../shapes/geometry';
import { PALETTE_GROUPS, SHAPE_LIST, specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import { ShapeDrawing } from '../shapes/shape-node';
import type { PaletteGroup, ShapeData, ShapeSpec } from '../shapes/types';
import type { DiagramImages, ImageEntry } from '../shapes/images';
import { imageIdOfKey, imageKeyOf, imageShapeOf, readImageFile } from './custom-images';
import { useDiagramMeta } from './diagram-meta';
import { createConnection, createShape, nextTag } from './new-cells';
import { usePreferences } from './preferences';

// The side of a tile's preview (px): every shape is scaled into it.
const PREVIEW_SIZE = 56;
const CONNECTION_KINDS: readonly ConnectionKind[] = ['Pipe', 'Wire', 'SignalLine', 'Arrow', 'Conveyor'];

/** An item of the palette: a kind of element or of connection, an uploaded image. */
type PaletteItem =
    | { readonly type: 'shape'; readonly spec: ShapeSpec }
    | { readonly type: 'connection'; readonly kind: ConnectionKind }
    | { readonly type: 'image'; readonly imageId: string; readonly image: ImageEntry };

function titleOf(item: PaletteItem): string {
    switch (item.type) {
        case 'shape': return item.spec.title;
        case 'connection': return CONNECTIONS[item.kind].title;
        case 'image': return item.image.name;
    }
}

function kindOf(item: PaletteItem): string {
    switch (item.type) {
        case 'shape': return item.spec.kind;
        case 'connection': return item.kind;
        case 'image': return 'CustomImage';
    }
}

/** The palette's own key of an item: a kind can have several entries, an image is its own. */
function keyOf(item: PaletteItem): string {
    switch (item.type) {
        case 'shape': return item.spec.paletteId ?? item.spec.kind;
        case 'connection': return item.kind;
        case 'image': return imageKeyOf(item.imageId);
    }
}

const groupOf = (item: PaletteItem): PaletteGroup | 'Custom' => {
    switch (item.type) {
        case 'shape': return item.spec.group;
        case 'connection': return CONNECTIONS[item.kind].group;
        case 'image': return 'Custom';
    }
};

/** The images of the diagram as palette items. */
const imageItemsOf = (images: DiagramImages): PaletteItem[] =>
    Object.entries(images).map(([imageId, image]): PaletteItem => ({ type: 'image', imageId, image }));

const ITEMS: readonly PaletteItem[] = [
    ...CONNECTION_KINDS.map((kind): PaletteItem => ({ type: 'connection', kind })),
    ...SHAPE_LIST.map((spec): PaletteItem => ({ type: 'shape', spec })),
];

/** The item of a kind (or of an image's key), if the palette has it. */
function itemOf(kind: string, images: DiagramImages): PaletteItem | undefined {
    const imageId = imageIdOfKey(kind);
    if (imageId !== null) {
        return Object.hasOwn(images, imageId) ? { type: 'image', imageId, image: images[imageId] } : undefined;
    }
    if (isConnectionKind(kind)) {
        return { type: 'connection', kind };
    }
    const spec = specOf(kind);
    return spec && SHAPE_LIST.includes(spec) ? { type: 'shape', spec } : undefined;
}

/** The kinds in the diagram, as one string: a primitive, so the palette re-renders only when one is added or removed. */
const selectKindsInUse = (cells: ReadonlyArray<Computed<CellRecord>>): string => {
    const kinds = new Set<string>();
    for (const cell of cells) {
        if (isShapeData(cell.data)) {
            const { imageId } = cell.data;
            kinds.add(cell.data.kind === 'CustomImage' && typeof imageId === 'string' ? imageKeyOf(imageId) : cell.data.kind);
        }
    }
    return [...kinds].sort().join(' ');
};

/** A search ignores the case and the dashes. */
const normalize = (text: string) => text.toLowerCase().replace(/[-\s]+/g, '');

/**
 * The drawing of a kind alone, scaled into the tile: with its stubs, without its label. The box is its footprint,
 * then what it draws once rendered: a part outside the footprint (the glow of a lit beacon) fits in the tile too.
 */
function ShapePreview({ spec }: { readonly spec: ShapeSpec }) {
    const data: ShapeData = { ...spec.defaults, kind: spec.kind };
    const footprint = footprintOf(spec, { ...data, label: undefined }, spec.size);
    const drawing = useRef<SVGGElement>(null);
    const [box, setBox] = useState(footprint);
    useLayoutEffect(() => {
        const bounds = drawing.current?.getBBox();
        if (!bounds || bounds.width === 0 || bounds.height === 0) {
            return;
        }
        const x = Math.min(footprint.x, bounds.x);
        const y = Math.min(footprint.y, bounds.y);
        const width = Math.max(footprint.x + footprint.width, bounds.x + bounds.width) - x;
        const height = Math.max(footprint.y + footprint.height, bounds.y + bounds.height) - y;
        // Only when it reaches out of the footprint: the same box keeps the state (no render).
        setBox((previous) => (previous.x === x && previous.y === y && previous.width === width && previous.height === height ? previous : { x, y, width, height }));
    }, [footprint.x, footprint.y, footprint.width, footprint.height]);
    return (
        <svg width={PREVIEW_SIZE} height={PREVIEW_SIZE} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden>
            <g ref={drawing}>
                <ShapeDrawing spec={spec} data={data} size={spec.size} angle={0} hasLabel={false} />
            </g>
        </svg>
    );
}

interface ItemProps {
    readonly item: PaletteItem;
    readonly onPreview: (kind: string) => void;
}

/** A tile: dragged onto the canvas adds the shape (with the next free ID of its series), clicked previews it. */
function PaletteTile({ item, onPreview }: ItemProps) {
    const { startCellDrag } = useStencil();
    const { graph } = useGraph();
    const title = titleOf(item);

    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        const tags = graph.getCells().flatMap((cell) => {
            const data: unknown = cell.get('data');
            return isShapeData(data) && data.tag ? [data.tag] : [];
        });
        if (item.type === 'image') {
            startCellDrag(imageShapeOf(item.imageId, item.image), event);
            return;
        }
        if (item.type === 'connection') {
            const prefix = CONNECTIONS[item.kind].tagPrefix;
            startCellDrag(createConnection(item.kind, prefix ? { tag: nextTag(prefix, tags) } : {}), event);
            return;
        }
        const { spec } = item;
        const tag = spec.autoTag && spec.tagPrefix ? nextTag(spec.tagPrefix, tags) : undefined;
        startCellDrag(createShape(spec, { tag }), event);
    };

    return (
        <li>
            <button
                type="button"
                onPointerDown={onPointerDown}
                onClick={() => onPreview(item.type === 'image' ? keyOf(item) : kindOf(item))}
                className="flex w-full touch-none flex-col overflow-hidden items-center gap-1 rounded-md border border-transparent px-1 py-2 text-ink-2 hover:border-rule hover:bg-paper focus-visible:border-accent"
                aria-label={title}
                title={`${title}: drag onto the diagram, click for its preview`}
            >
                {item.type === 'image' && (
                    <img src={item.image.href} alt="" width={PREVIEW_SIZE} height={PREVIEW_SIZE} draggable={false} className="size-14 object-contain" />
                )}
                {item.type === 'shape' && <ShapePreview spec={item.spec} />}
                {item.type === 'connection' && (
                    <svg width={PREVIEW_SIZE} height={PREVIEW_SIZE / 2} aria-hidden>
                        <line x1={2} y1={PREVIEW_SIZE / 4} x2={PREVIEW_SIZE - 2} y2={PREVIEW_SIZE / 4} stroke={CONNECTIONS[item.kind].colorField?.defaultValue} strokeWidth={item.kind === 'Pipe' || item.kind === 'Conveyor' ? 6 : 2} strokeDasharray={item.kind === 'SignalLine' ? '4 3' : undefined} />
                    </svg>
                )}
                <span className="text-center text-[11px] leading-tight">{title}</span>
            </button>
        </li>
    );
}

interface SectionProps {
    readonly title: string;
    readonly icon?: 'favorites' | 'in-use' | 'custom';
    readonly items: readonly PaletteItem[];
    readonly onPreview: (kind: string) => void;
    /** Under the header (the upload of the Custom group): the section is shown without items too. */
    readonly action?: ReactNode;
}

function PaletteSection({ title, icon, items, onPreview, action }: SectionProps) {
    const [isOpen, setIsOpen] = useState(true);
    if (items.length === 0 && !action) {
        return null;
    }
    return (
        <section className="border-b border-rule">
            <h2>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left font-display text-sm font-medium text-ink" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
                    {icon === 'favorites' && <Star className="size-4" aria-hidden />}
                    {icon === 'in-use' && <Layers className="size-4" aria-hidden />}
                    {icon === 'custom' && <ImageIcon className="size-4" aria-hidden />}
                    <span className="flex-1">{title}</span>
                    <ChevronDown className={`size-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} aria-hidden />
                </button>
            </h2>
            {isOpen && action}
            {isOpen && items.length > 0 && (
                <ul className="grid grid-cols-3 gap-0.5 px-1 pb-2">
                    {items.map((item) => <PaletteTile key={keyOf(item)} item={item} onPreview={onPreview} />)}
                </ul>
            )}
        </section>
    );
}

/** Uploads images (PNG, JPEG, SVG, ...) into the diagram: shapes of the user's own, in the Custom group. */
function UploadImages() {
    const { updateMeta } = useDiagramMeta();
    const input = useRef<HTMLInputElement>(null);
    const upload = async (files: readonly File[]) => {
        const images = (await Promise.all(files.map(readImageFile))).filter((image): image is ImageEntry => image !== null);
        if (images.length === 0) {
            return;
        }
        updateMeta((meta) => ({
            ...meta,
            images: { ...meta.images, ...Object.fromEntries(images.map((image) => [`image-${crypto.randomUUID()}`, image])) },
        }));
    };
    return (
        <div className="px-3 pb-2">
            <button type="button" className="key w-full justify-center" title="Upload images (PNG, JPEG, SVG, ...) as shapes of your own" onClick={() => input.current?.click()}>
                <Upload className="size-4" aria-hidden /> Upload images
            </button>
            <input
                ref={input}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    // The same files can be uploaded again.
                    event.target.value = '';
                    void upload(files);
                }}
            />
        </div>
    );
}

/**
 * The palette: a search, the favorites, the shapes in use, then every group. Drag a shape onto the canvas to add it,
 * click it to preview it in the side panel.
 */
export function ShapePalette({ onPreview }: { readonly onPreview: (kind: string) => void }) {
    const [query, setQuery] = useState('');
    const { meta } = useDiagramMeta();
    const [preferences] = usePreferences();
    const kindsInUse = useCells(selectKindsInUse);
    const search = normalize(query.trim());
    const matches = (item: PaletteItem) => search === '' || normalize(`${titleOf(item)} ${kindOf(item)}`).includes(search);
    const favorites = meta.favorites.flatMap((kind) => itemOf(kind, meta.images) ?? []).filter(matches);
    const inUse = kindsInUse === '' ? [] : kindsInUse.split(' ').flatMap((kind) => itemOf(kind, meta.images) ?? []).filter(matches);

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-rule p-3">
                <label className="relative block">
                    <span className="sr-only">Search the shapes</span>
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="search" className="field pl-8" />
                </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <PaletteSection title="Favorites" icon="favorites" items={favorites} onPreview={onPreview} />
                {preferences.inUseGroup && <PaletteSection title="In Use" icon="in-use" items={inUse} onPreview={onPreview} />}
                <PaletteSection title="Custom" icon="custom" items={imageItemsOf(meta.images).filter(matches)} onPreview={onPreview} action={<UploadImages />} />
                {PALETTE_GROUPS.map((group) => (
                    <PaletteSection key={group} title={group} items={ITEMS.filter((item) => groupOf(item) === group && matches(item))} onPreview={onPreview} />
                ))}
            </div>
        </div>
    );
}
