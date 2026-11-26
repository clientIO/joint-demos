import { Settings, Star, Trash2 } from 'lucide-react';
import { useCells, useGraph, useSelectionCollection, type CellId, type CellRecord, type Computed } from '@joint/react-plus';
import { CONNECTIONS, isConnectionKind } from '../connections/connections';
import { EXAMPLES, type Example } from '../files/examples';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import { imageIdOfKey } from './custom-images';
import { useEditorActions } from './use-editor-actions';
import { useDiagramMeta } from './diagram-meta';
import { DiagramSettings } from './diagram-settings';
import { ShapeInspector } from './shape-inspector';

/** What the side panel shows: the inspector of the selection (the examples when nothing is), the settings, a palette shape. */
export type PanelContent =
    | { readonly kind: 'selection' }
    | { readonly kind: 'settings' }
    | { readonly kind: 'preview'; readonly shape: string };

const selectIds = (cells: ReadonlyArray<Computed<CellRecord>>): readonly CellId[] => cells.map((cell) => cell.id);
const isSameIds = (a: readonly CellId[], b: readonly CellId[]) => a.length === b.length && a.every((id, index) => id === b[index]);

/** Nothing selected: the way to the settings and the examples. */
function Placeholder({ onOpenSettings, onOpenExample }: { readonly onOpenSettings: () => void; readonly onOpenExample: (example: Example) => void }) {
    return (
        <div className="grid gap-5 p-4">
            <div className="grid justify-items-center gap-3 rounded-lg border border-dashed border-rule-2 p-4 text-center text-sm text-ink-2">
                <p>Select a shape on the canvas or in the palette to see its properties.</p>
                <span className="text-muted">or</span>
                <button type="button" className="key" onClick={onOpenSettings}><Settings className="size-4" aria-hidden /> Diagram settings</button>
                <p className="text-muted">the screen, the style, the animations, the editor</p>
            </div>
            <section className="grid gap-2">
                <h2 className="font-display text-sm font-medium text-muted">Examples</h2>
                {EXAMPLES.map((example) => (
                    <button key={example.name} type="button" className="grid gap-1 rounded-lg border border-rule bg-paper p-3 text-left hover:border-rule-2" onClick={() => onOpenExample(example)}>
                        <span className="font-display font-semibold text-ink">{example.name}</span>
                        <span className="text-sm text-ink-2">{example.description}</span>
                    </button>
                ))}
            </section>
        </div>
    );
}

/** A shape of the palette: its name, description, and favorites. */
function ShapePreviewPanel({ kind }: { readonly kind: string }) {
    const { meta, updateMeta } = useDiagramMeta();
    const spec = specOf(kind);
    const connection = isConnectionKind(kind) ? CONNECTIONS[kind] : undefined;
    const title = spec?.title ?? connection?.title ?? kind;
    const description = spec?.description ?? connection?.description ?? '';
    const isFavorite = meta.favorites.includes(kind);
    const toggleFavorite = () => updateMeta((previous) => ({
        ...previous,
        favorites: isFavorite ? previous.favorites.filter((favorite) => favorite !== kind) : [...previous.favorites, kind],
    }));
    return (
        <div className="grid gap-3 p-4">
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            <p className="text-sm text-ink-2">{description}</p>
            <button type="button" className="key justify-self-start" aria-pressed={isFavorite} onClick={toggleFavorite}>
                <Star className="size-4" aria-hidden fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </button>
        </div>
    );
}

/** An uploaded image of the palette: its name (renamed here), its favorite, its deletion from the diagram. */
function ImagePreviewPanel({ imageKey, imageId }: { readonly imageKey: string; readonly imageId: string }) {
    const { meta, updateMeta } = useDiagramMeta();
    const { graph, transaction } = useGraph();
    const { removeWithGroups } = useEditorActions();
    const { selectCells } = useSelectionCollection();
    const image = Object.hasOwn(meta.images, imageId) ? meta.images[imageId] : undefined;
    if (!image) {
        return null;
    }
    const isFavorite = meta.favorites.includes(imageKey);
    const rename = (text: string) => {
        const name = text.trim();
        if (name && name !== image.name) {
            updateMeta((previous) => ({ ...previous, images: { ...previous.images, [imageId]: { ...image, name } } }));
        }
    };
    /**
     * The image out of the palette, every element showing it out of the diagram: one step of the history (an undo
     * brings back both). Not a favorite anymore: the favorites are not in the history.
     */
    const remove = () => {
        selectCells([]);
        updateMeta((previous) => ({ ...previous, favorites: previous.favorites.filter((favorite) => favorite !== imageKey) }));
        transaction(() => {
            // The elements first: an undo brings back the image before them.
            // A group left with one member is dissolved, as on any removal.
            removeWithGroups(graph.getElements().filter((element) => {
                const data: unknown = element.get('data');
                return isShapeData(data) && data.imageId === imageId;
            }));
            updateMeta((previous) => ({ ...previous, images: Object.fromEntries(Object.entries(previous.images).filter(([id]) => id !== imageId)) }));
        }, { name: 'delete-image' });
    };
    const toggleFavorite = () => updateMeta((previous) => ({
        ...previous,
        favorites: isFavorite ? previous.favorites.filter((favorite) => favorite !== imageKey) : [...previous.favorites, imageKey],
    }));
    return (
        <div className="grid gap-3 p-4">
            <h2 className="font-display text-lg font-semibold text-ink">{image.name}</h2>
            <p className="text-sm text-ink-2">An image of your own, uploaded into the diagram: it is saved with it, once, however many elements show it.</p>
            <img src={image.href} alt="" className="max-h-44 w-full rounded-md border border-rule bg-[var(--shape-canvas)] object-contain p-2" />
            <label className="grid gap-1 text-sm text-ink-2">
                Name
                <input
                    key={image.name}
                    type="text"
                    defaultValue={image.name}
                    className="field"
                    onBlur={(event) => rename(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            rename(event.currentTarget.value);
                        }
                    }}
                />
            </label>
            <div className="flex flex-wrap gap-2">
                <button type="button" className="key" aria-pressed={isFavorite} onClick={toggleFavorite}>
                    <Star className="size-4" aria-hidden fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Favorite' : 'Add to favorites'}
                </button>
                <button type="button" className="key" onClick={remove}><Trash2 className="size-4" aria-hidden /> Delete image</button>
            </div>
        </div>
    );
}

interface SidePanelProps {
    readonly content: PanelContent;
    readonly onContentChange: (content: PanelContent) => void;
    readonly onOpenExample: (example: Example) => void;
}

/** The panel on the right: one thing at a time. A shape selected on the canvas shows its inspector. */
export function SidePanel({ content, onContentChange, onOpenExample }: SidePanelProps) {
    const { collection } = useSelectionCollection();
    const ids = useCells(collection, selectIds, isSameIds);
    if (content.kind === 'settings') {
        return <DiagramSettings onClose={() => onContentChange({ kind: 'selection' })} />;
    }
    if (ids.length > 0) {
        return <ShapeInspector ids={ids} />;
    }
    if (content.kind === 'preview') {
        const imageId = imageIdOfKey(content.shape);
        return imageId === null ? <ShapePreviewPanel kind={content.shape} /> : <ImagePreviewPanel imageKey={content.shape} imageId={imageId} />;
    }
    return <Placeholder onOpenSettings={() => onContentChange({ kind: 'settings' })} onOpenExample={onOpenExample} />;
}
