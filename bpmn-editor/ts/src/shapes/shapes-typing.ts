import type { dia, g, ui } from '@joint/plus';
import type { PlaceholderShapeTypes } from './placeholder/placeholder-config';
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
    copyFrom: (shape: AppShape) => void;
    getShapeList: () => string[];
    validateConnection: (targetModel?: dia.Cell) => boolean;
    getLabelEditorStyles?: (paper: dia.Paper) => Partial<CSSStyleDeclaration>;
}

interface AppearanceConfig {
    groups: Record<string, { label: string, index: number }>;
    inputs: Record<string, Record<string, any>>;
}

export interface AppElement extends dia.Element {
    readonly isResizable: boolean;
    readonly labelPath: string;
    readonly labelSelector?: string;
    // False by default
    readonly omitDefaultHaloHandles?: boolean;
    copyFrom: (element: dia.Element) => void;
    getShapeList: () => string[];
    getAppearanceConfig: () => AppearanceConfig;
    getHaloHandles?: () => ui.Halo.Handle[];
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

export interface AppLink extends dia.Link {
    getShapeList: () => string[];
    getLinkTools: () => dia.ToolView[];
    copyFrom: (link: dia.Link) => void;
    getAppearanceConfig: () => AppearanceConfig;
    validateConnection: (targetModel?: dia.Cell) => boolean;
    getLabelEditorStyles?: (paper: dia.Paper) => Partial<CSSStyleDeclaration>;
}
