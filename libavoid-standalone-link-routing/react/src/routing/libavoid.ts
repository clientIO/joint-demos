import { AvoidLib } from 'libavoid-js';
// The URL of the emitted `.wasm` asset. `libavoid-wasm` is an alias onto the
// file inside `libavoid-js` (see `vite.config.ts`): the worker has no
// `document`, so the library cannot derive the location of its own binary the
// way it does on the main thread, and has to be told.
import wasmUrl from 'libavoid-wasm?url';

/*
 * `libavoid-js` ships a shorthand ambient declaration (`declare module
 * "libavoid-js"`), so everything it exports arrives as `any`. These interfaces
 * cover the slice of the Emscripten binding this demo uses, and `getAvoid()`
 * casts the instance to them once, at the single point where it is obtained.
 */

export interface AvoidPoint {
    readonly x: number;
    readonly y: number;
}

export interface AvoidPolyLine {
    size(): number;
    get_ps(index: number): AvoidPoint;
}

export interface AvoidPolygon {
    readonly __polygon?: never;
}

export interface AvoidShapeRef {
    readonly __shapeRef?: never;
}

export interface AvoidConnEnd {
    readonly __connEnd?: never;
}

export interface AvoidConnRef {
    /** Raw pointer to the binding's C++ object; the identity we key links by. */
    readonly g: number;
    displayRoute(): AvoidPolyLine;
    setSourceEndpoint(end: AvoidConnEnd): void;
    setDestEndpoint(end: AvoidConnEnd): void;
    setCallback(callback: (connRefPtr: number) => void, connRef: AvoidConnRef): void;
}

export interface AvoidShapeConnectionPin {
    setExclusive(exclusive: boolean): void;
}

export interface AvoidRouterInstance {
    processTransaction(): void;
    moveShape(shape: AvoidShapeRef, polygon: AvoidPolygon): void;
    deleteShape(shape: AvoidShapeRef): void;
    deleteConnector(connRef: AvoidConnRef): void;
    setRoutingParameter(parameter: number, value: number): void;
    setRoutingOption(option: number, value: boolean): void;
}

/** The subset of the `libavoid-js` module instance this demo touches. */
export interface Avoid {
    readonly OrthogonalRouting: number;
    readonly ConnDirUp: number;
    readonly ConnDirRight: number;
    readonly ConnDirDown: number;
    readonly ConnDirLeft: number;
    readonly ConnDirAll: number;
    readonly idealNudgingDistance: number;
    readonly shapeBufferDistance: number;
    readonly nudgeOrthogonalTouchingColinearSegments: number;
    readonly performUnifyingNudgingPreprocessingStep: number;
    readonly nudgeSharedPathsWithCommonEndPoint: number;
    readonly nudgeOrthogonalSegmentsConnectedToShapes: number;
    readonly Router: new (flags: number) => AvoidRouterInstance;
    readonly Point: new (x: number, y: number) => AvoidPoint;
    readonly Rectangle: new (topLeft: AvoidPoint, bottomRight: AvoidPoint) => AvoidPolygon;
    readonly ShapeRef: new (router: AvoidRouterInstance, polygon: AvoidPolygon) => AvoidShapeRef;
    readonly ConnRef: new (router: AvoidRouterInstance) => AvoidConnRef;
    readonly ConnEnd: new (shape: AvoidShapeRef, pinClassId: number) => AvoidConnEnd;
    readonly ShapeConnectionPin: new (
        shape: AvoidShapeRef,
        pinClassId: number,
        xOffset: number,
        yOffset: number,
        proportional: boolean,
        insideOffset: number,
        visDirs: number
    ) => AvoidShapeConnectionPin;
}

/** Loads the WebAssembly module. Must resolve before {@link getAvoid} is called. */
export function loadAvoid(): Promise<void> {
    return AvoidLib.load(wasmUrl);
}

export function getAvoid(): Avoid {
    return AvoidLib.getInstance() as unknown as Avoid;
}
