import type { dia, g } from '@joint/plus';
import type { HaloHandle } from '@joint/react-plus';
import type { PlaceholderShapeTypes } from './link-config';
import type { AnnotationShapeTypes } from './annotation/annotation-config';
import type { DataShapeTypes } from './data/data-config';
import type { FlowShapeTypes } from './flow/flow-config';

export enum MarkerNames {
    PARALLEL = 'parallel',
    SEQUENTIAL = 'sequential',
    SUB_PROCESS = 'sub-process',
    COMPENSATION = 'compensation',
    AD_HOC = 'ad-hoc',
    LOOP = 'loop',
    COLLECTION = 'collection'
}

export enum ShapeTypes {
    ACTIVITY = 'activity',
    DATA_OBJECT = 'dataObject',
    DATA_STORE = 'dataStore',
    DATA_ASSOCIATION = 'dataAssociation',
    EVENT = 'event',
    GATEWAY = 'gateway',
    FLOW = 'flow',
    ANNOTATION = 'annotation',
    GROUP = 'group',
    POOL = 'pool',
    SWIMLANE = 'swimlane'
}

export type LinkType =
    PlaceholderShapeTypes.LINK |
    AnnotationShapeTypes.LINK |
    DataShapeTypes.DATA_ASSOCIATION |
    FlowShapeTypes.SEQUENCE |
    FlowShapeTypes.MESSAGE |
    FlowShapeTypes.DEFAULT |
    FlowShapeTypes.CONDITIONAL;

export interface Marker {
    name: MarkerNames;
    cssClass: string;
    index?: number;
}

export interface AppShape extends dia.Cell {
    // Method syntax on purpose: parameters check bivariantly, so the
    // element/link interfaces (whose `copyFrom` takes the concrete cell type)
    // stay assignable to AppShape.
    copyFrom(shape: dia.Cell): void;
    getShapeList: () => string[];
    validateConnection: (targetModel?: dia.Cell) => boolean;
    getLabelEditorStyles?: (paper: dia.Paper) => Partial<CSSStyleDeclaration>;
}

export interface AppearanceSelectOption {
    value: string | number;
    label: string;
}

interface AppearanceFieldBase {
    /** Slash-separated cell property path (`attrs/label/fill`, `labels/0/attrs/body/fill`). */
    path: string;
    label: string;
    /** Shown when the cell has no value at `path`. */
    defaultValue?: string | number;
    /** Left out where the field has no counterpart on other cells. */
    role?: AppearanceRole;
}

export interface AppearanceColorField extends AppearanceFieldBase {
    type: 'color';
}

export interface AppearanceSelectBoxField extends AppearanceFieldBase {
    type: 'select-box';
    options: AppearanceSelectOption[];
}

/**
 * What a field controls. The same role lives at a different path from one shape
 * family to the next — a task's fill is `attrs/background/fill` where a
 * gateway's is `attrs/body/fill`, and a pool names its label through
 * `attrs/headerText` where everything else uses `attrs/label` — so a form
 * spanning several selected cells pairs their fields up by this rather than by
 * path.
 *
 * At most one field per role per config: the first match in group order wins.
 */
export type AppearanceRole =
    | 'fill'
    | 'outline'
    | 'text'
    | 'font-family'
    | 'font-size'
    | 'font-weight';

export type AppearanceField = AppearanceColorField | AppearanceSelectBoxField;

export interface AppearanceGroup {
    label?: string;
    /** The group renders only while the predicate holds (defaults to always). */
    visibleWhen?: (cell: dia.Cell) => boolean;
    fields: AppearanceField[];
}

/** The Appearance inspector tab: groups render in array order. */
export type AppearanceConfig = AppearanceGroup[];

export interface AppElement extends dia.Element {
    readonly isResizable: boolean;
    readonly labelPath: string;
    readonly labelSelector?: string;
    // False by default
    readonly omitDefaultHaloHandles?: boolean;
    copyFrom(element: dia.Element): void;
    getShapeList: () => string[];
    getAppearanceConfig: () => AppearanceConfig;
    getHaloHandles?: () => HaloHandle[];
    availableMarkers?: Marker[];
    validateConnection: (targetModel?: dia.Cell) => boolean;
    validateEmbedding: (parent: dia.Element, inGraph?: boolean) => boolean;
    validateUnembedding?: () => boolean;
    sortMarkers?: (markers: MarkerNames[]) => MarkerNames[];
    getMarkers?: () => Marker[];
    setMarkers?: (markers: MarkerNames[]) => void;
    validateMarkers?: (markers: MarkerNames[], prevMarkers: MarkerNames[]) => MarkerNames[];
    getLabelEditorStyles?: (paper: dia.Paper) => Partial<CSSStyleDeclaration>;
    getClosestBoundaryPoint: (bbox: g.Rect, point: g.Point) => g.Point | null;
    getMinimalSize?: () => { width: number, height: number };
}

/** The actions a link offers in its context menu. */
export type LinkContextMenuAction = 'edit-label' | 'add-comment';

export interface AppLink extends dia.Link {
    getShapeList: () => string[];
    getContextMenuActions: () => LinkContextMenuAction[];
    getLinkTools: () => dia.ToolView[];
    copyFrom(link: dia.Link): void;
    getAppearanceConfig: () => AppearanceConfig;
    validateConnection: (targetModel?: dia.Cell) => boolean;
    getLabelEditorStyles?: (paper: dia.Paper) => Partial<CSSStyleDeclaration>;
}
