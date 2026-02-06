import type { dia } from '@joint/plus';
import { shapes, util, V, type g } from '@joint/plus';
import type { AppElement, AppLink, Marker } from '../shapes-typing';
import { MarkerNames, ShapeTypes } from '../shapes-typing';
import { dataObjectAppearanceConfig, dataStoreAppearanceConfig, dataAssociationAppearanceConfig, dataIconClasses, DataShapeTypes, DataLabels } from './data-config';
import { ActivityShapeTypes } from '../activity/activity-config';
import { EventShapeTypes } from '../event/event-config';
import { defaultAttrs, labelEditorWrapperStyles, markerClasses } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { handles } from '../../configs/halo-config';
import { constructLinkTools } from '../../configs/link-tools-config';

const LABEL_Y_OFFSET = 14;

// DataObject

abstract class Data extends shapes.bpmn2.DataObject implements AppElement {

    public readonly isResizable = false;
    public readonly labelPath = 'label/text';
    public readonly labelSelector = 'labelGroup';

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.DATA_OBJECT,
            markers: [],
            attrs: {
                label: {
                    ...defaultAttrs.shapeLabel,
                    refX: null,
                    refY: null,
                    refY2: null,
                    x: 'calc(w/2)',
                    y: `calc(h+${LABEL_Y_OFFSET})`,
                },
                labelBody: defaultAttrs.labelBody
            },
            size: {
                width: 40,
                height: 50
            }
        }, super.defaults);
    }

    preinitialize(...args: any[]) {
        super.preinitialize(...args);
        // Add `labelBody` to markup
        this.markup = util.svg/* xml */ `
            <path @selector="body"/>
            <image @selector="dataTypeIcon"/>
            <image @selector="collectionIcon"/>
            <g @selector="labelGroup">
                <rect @selector="labelBody"/>
                <text @selector="label"/>
            </g>
        `;
    }

    initialize(...args: any[]): void {
        super.initialize(...args);
        this.on('change:markers', () => this.onMarkersChange());
    }

    onMarkersChange(): void {
        const collection = Boolean(this.get('markers')[0]);
        this.attr(['collectionIcon', 'collection'], collection);
    }

    getMarkers(): Marker[] {
        return [
            { index: 0, name: MarkerNames.COLLECTION, cssClass: markerClasses.COLLECTION }
        ];
    }

    setMarkers(markers: MarkerNames[]) {
        this.set('markers', markers);
    }

    getShapeList(): string[] {
        return [];
    }

    getAppearanceConfig() {
        return dataObjectAppearanceConfig;
    }

    getHaloHandles() {
        return [
            handles.ConnectAnnotation,
            handles.Link
        ];
    }

    copyFrom(element: dia.Element): void {
        const { x, y, width, height } = element.getBBox();
        const label = element.attr(['label', 'text']) || '';
        const markers = element.get('markers');
        this.prop({
            position: { x, y },
            size: { width, height },
            markers,
            attrs: {
                body: {
                    fill: element.attr(['body', 'fill']),
                    stroke: element.attr(['body', 'stroke'])
                },
                label: {
                    text: label,
                    fontFamily: element.attr(['label', 'fontFamily']),
                    fontSize: element.attr(['label', 'fontSize']),
                    fontWeight: element.attr(['label', 'fontWeight']),
                    fill: element.attr(['label', 'fill'])
                }
            }
        });
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        // Include throwing events and end events
        const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
            const lowerType = type.toLowerCase();
            return lowerType.includes('throwing') || lowerType.includes('end');
        });

        const availableShapes = [
            ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
            ...validEventTypes,
            AnnotationShapeTypes.ANNOTATION
        ];

        return availableShapes.includes(targetModel?.get('type'));
    }

    validateEmbedding(parent: dia.Element): boolean {
        return parent.get('shapeType') === ShapeTypes.SWIMLANE;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        const labelAttrs = this.attr(['label']) || {};

        const padding = 4;

        const bbox = this.getBBox();

        const { x: bottomMiddleX, y: bottomMiddleY } = bbox.bottomMiddle();

        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth!);

        const labelEditorWidth = 2 * bbox.width + 2 * padding;
        const x = bottomMiddleX - labelEditorWidth / 2;
        const y = bottomMiddleY + LABEL_Y_OFFSET - padding - borderWidth;

        return {
            padding: `${padding}px`,
            transform: V.matrixToTransformString(paper.matrix().translate(x, y)),
            transformOrigin: '0 0',
            width: `${labelEditorWidth}px`,
            fontFamily: labelAttrs.fontFamily,
            fontSize: `${labelAttrs.fontSize}px`,
            fontWeight: labelAttrs.fontWeight,
            color: labelAttrs.fill
        };
    }

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }
}

export class DataObject extends Data {

    static label = DataLabels['data.DataObject'];
    static icon = dataIconClasses.DATA_OBJECT;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: DataShapeTypes.DATA_OBJECT,
            attrs: {
                label: {
                    text: 'Data Object'
                }
            }
        }, super.defaults());
    }

    getShapeList(): string[] {
        return [
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
        ];
    }
}

export class DataInput extends Data {

    static label = DataLabels['data.DataInput'];
    static icon = dataIconClasses.DATA_INPUT;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: DataShapeTypes.DATA_INPUT,
            attrs: {
                dataTypeIcon: {
                    iconType: 'input'
                },
                label: {
                    text: 'Data Input'
                }
            }
        }, super.defaults());
    }

    getShapeList(): string[] {
        return [
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_OUTPUT
        ];
    }
}

export class DataOutput extends Data {

    static label = DataLabels['data.DataOutput'];
    static icon = dataIconClasses.DATA_OUTPUT;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: DataShapeTypes.DATA_OUTPUT,
            attrs: {
                dataTypeIcon: {
                    iconType: 'output'
                },
                label: {
                    text: 'Data Output'
                }
            }
        }, super.defaults());
    }

    getShapeList(): string[] {
        return [
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT
        ];
    }
}

// Store

export class DataStore extends shapes.bpmn2.DataStore implements AppElement {

    public readonly isResizable = false;
    public readonly labelPath = 'label/text';
    public readonly labelSelector = 'labelGroup';

    static label = DataLabels['data.DataStore'];
    static icon = dataIconClasses.DATA_STORE;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: DataShapeTypes.DATA_STORE,
            shapeType: ShapeTypes.DATA_STORE,
            attrs: {
                label: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Data Store'
                },
                labelBody: defaultAttrs.labelBody
            },
            size: {
                width: 50,
                height: 50
            }
        }, super.defaults);
    }

    preinitialize(...args: any[]) {
        super.preinitialize(...args);
        // Add `labelBody` to markup
        this.markup = util.svg/* xml */ `
            <path @selector="body"/>
            <ellipse @selector="top"/>
            <g @selector="labelGroup">
                <rect @selector="labelBody"/>
                <text @selector="label"/>
            </g>
        `;
    }

    getShapeList(): string[] {
        return [];
    }

    getAppearanceConfig() {
        return dataStoreAppearanceConfig;
    }

    getHaloHandles() {
        return [
            handles.ConnectAnnotation,
            handles.Link
        ];
    }

    copyFrom() { }

    validateConnection(targetModel?: dia.Cell): boolean {
        // Include throwing events and end events
        const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
            const lowerType = type.toLowerCase();
            return lowerType.includes('throwing') || lowerType.includes('end');
        });

        const availableShapes = [
            ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
            ...validEventTypes,
            AnnotationShapeTypes.ANNOTATION
        ];

        return availableShapes.includes(targetModel?.get('type'));
    }

    validateEmbedding(parent: dia.Element): boolean {
        return parent.get('shapeType') === ShapeTypes.SWIMLANE;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        const labelAttrs = this.attr(['label']) || {};

        const padding = 4;

        const bbox = this.getBBox();

        const { x: bottomMiddleX, y: bottomMiddleY } = bbox.bottomMiddle();

        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth!);

        const labelEditorWidth = 2 * bbox.width + 2 * padding;
        const x = bottomMiddleX - labelEditorWidth / 2;
        const y = bottomMiddleY + LABEL_Y_OFFSET - padding - borderWidth;

        return {
            padding: `${padding}px`,
            transform: V.matrixToTransformString(paper.matrix().translate(x, y)),
            transformOrigin: '0 0',
            width: `${labelEditorWidth}px`,
            fontFamily: labelAttrs.fontFamily,
            fontSize: `${labelAttrs.fontSize}px`,
            fontWeight: labelAttrs.fontWeight,
            color: labelAttrs.fill
        };
    }

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }
}

// Association

export class DataAssociation extends shapes.bpmn2.DataAssociation implements AppLink {

    static label = DataLabels['data.DataAssociation'];

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: DataShapeTypes.DATA_ASSOCIATION,
            shapeType: ShapeTypes.DATA_ASSOCIATION
        }, super.defaults);
    }

    copyFrom(link: dia.Link): void {
        this.source(link.source());
        this.target(link.target());
        this.vertices(link.vertices());
    }

    getShapeList(): string[] {
        return [];
    }

    getLinkTools() {
        return [
            constructLinkTools.Vertices(),
            constructLinkTools.SourceArrowHead(),
            constructLinkTools.TargetArrowHead(),
            ...constructLinkTools.DoubleRemove()
        ];
    }

    getAppearanceConfig() {
        return dataAssociationAppearanceConfig;
    }

    validateConnection(_?: dia.Cell): boolean {
        return false;
    }
}

declare module '@joint/plus' {
    namespace shapes {
        namespace data {
            export {
                DataObject,
                DataInput,
                DataOutput,
                DataStore,
                DataAssociation
            };
        }
    }
}

Object.assign(shapes, {
    data: {
        DataStore,
        DataObject,
        DataInput,
        DataOutput,
        DataAssociation
    }
});
