import { shapes, util, V } from '@joint/plus';
import { activityIconClasses, ActivityLabels, ActivityShapeTypes, activityAppearanceConfig } from './activity-config';
import { MarkerNames, ShapeTypes } from '../shapes-typing';
import { DataShapeTypes } from '../data/data-config';
import { GatewayShapeTypes } from '../gateway/gateway-config';
import { EventShapeTypes } from '../event/event-config';
import { defaultAttrs, markerClasses } from '../shared-config';
import { PoolShapeTypes } from '../pool/pool-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { handles } from '../../configs/halo-config';
import { isPoolShared, getPoolParent } from '../../utils';

export class Activity extends shapes.bpmn2.Activity {
    
    isResizable = false;
    labelPath = 'label/text';
    
    defaults() {
        return util.defaultsDeep({
            shapeType: ShapeTypes.ACTIVITY,
            markers: [],
            attrs: {
                root: {
                    containerSelector: 'background'
                },
                label: {
                    ...defaultAttrs.shapeLabel,
                    textVerticalAnchor: 'middle',
                    text: 'Activity',
                    textWrap: {
                        width: -10,
                        height: null, // reset the default -50 height and use maxLineCount instead
                        maxLineCount: 2,
                        ellipsis: true
                    }
                }
            }
        }, super.defaults);
    }
    
    initialize(...args) {
        super.initialize(...args);
        this.on('change:markers', () => this.onMarkersChange());
    }
    
    onMarkersChange() {
        const markers = this.get('markers');
        this.attr(['markers', 'iconTypes'], markers, { rewrite: true });
    }
    
    getShapeList() {
        const shapes = [
            ActivityShapeTypes.TASK,
            ActivityShapeTypes.USER,
            ActivityShapeTypes.SERVICE,
            ActivityShapeTypes.SEND,
            ActivityShapeTypes.RECEIVE,
            ActivityShapeTypes.MANUAL,
            ActivityShapeTypes.BUSINESS_RULE,
            ActivityShapeTypes.SCRIPT,
            ActivityShapeTypes.CALL_ACTIVITY,
            ActivityShapeTypes.SUB_PROCESS,
            ActivityShapeTypes.EVENT_SUB_PROCESS
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    getAppearanceConfig() {
        return activityAppearanceConfig;
    }
    
    getHaloHandles() {
        return [
            handles.ConnectEndEvent,
            handles.ConnectIntermediateThrowingEvent,
            handles.ConnectGateway,
            handles.ConnectTask,
            handles.ConnectAnnotation,
            handles.Link
        ];
    }
    
    copyFrom(element) {
        const { x, y, width, height } = element.getBBox();
        const label = element.attr(['label', 'text']) || '';
        
        this.prop({
            position: { x, y },
            size: { width, height },
            attrs: {
                background: {
                    fill: element.attr(['background', 'fill'])
                },
                border: {
                    stroke: element.attr(['border', 'stroke'])
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
        
        this.setMarkers(element.prop('markers') ?? []);
    }
    
    validateConnection(targetModel) {
        
        // Prevent connecting to the same pool
        if (getPoolParent(this) === targetModel)
            return false;
        
        const availableShapes = [
            ...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION,
            PoolShapeTypes.HORIZONTAL_POOL,
            PoolShapeTypes.VERTICAL_POOL
        ];
        
        const targetParent = targetModel?.parent();
        
        // Activity and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });
            
            availableShapes.push(...Object.values(GatewayShapeTypes), ...validEventTypes);
        }
        else {
            // Activity and target do not share the same pool
            availableShapes.push(EventShapeTypes.START, EventShapeTypes.MESSAGE_START, EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING);
        }
        
        return availableShapes.includes(targetModel?.get('type'));
    }
    
    validateMarkers(markers, prevMarkers) {
        let idxToRemove = -1;
        if (prevMarkers.includes(MarkerNames.LOOP)) {
            idxToRemove = markers.indexOf(MarkerNames.LOOP);
        }
        if (markers.includes(MarkerNames.LOOP) && !prevMarkers.includes(MarkerNames.LOOP)) {
            return [MarkerNames.LOOP];
        }
        if (prevMarkers.includes(MarkerNames.PARALLEL) && markers.includes(MarkerNames.SEQUENTIAL)) {
            idxToRemove = markers.indexOf(MarkerNames.PARALLEL);
        }
        if (prevMarkers.includes(MarkerNames.SEQUENTIAL) && markers.includes(MarkerNames.PARALLEL)) {
            idxToRemove = markers.indexOf(MarkerNames.SEQUENTIAL);
        }
        idxToRemove > -1 && markers.splice(idxToRemove, 1);
        
        if (markers.includes(MarkerNames.AD_HOC) || markers.includes(MarkerNames.SUB_PROCESS)) {
            markers = markers.filter((marker) => marker !== MarkerNames.AD_HOC && marker !== MarkerNames.SUB_PROCESS);
        }
        
        return markers;
    }
    
    sortMarkers(markers) {
        return markers.sort((markerA, markerB) => {
            const markersConfig = this.getMarkers();
            const markerAIdx = markersConfig.find((markerConfig) => markerConfig.name === markerA);
            const markerBIdx = markersConfig.find((markerConfig) => markerConfig.name === markerB);
            if (markerAIdx && markerBIdx) {
                const { index: markerAIndex = 0 } = markerAIdx;
                const { index: markerBIndex = 0 } = markerBIdx;
                
                return markerAIndex > markerBIndex ? 1 : -1;
            }
            return 0;
        });
    }
    
    getMarkers() {
        return [
            { name: MarkerNames.PARALLEL, index: 0, cssClass: markerClasses.PARALLEL },
            { name: MarkerNames.SEQUENTIAL, index: 1, cssClass: markerClasses.SEQUENTIAL },
            { name: MarkerNames.COMPENSATION, index: 2, cssClass: markerClasses.COMPENSATION },
            { name: MarkerNames.LOOP, index: 3, cssClass: markerClasses.LOOP },
        ];
    }
    
    setMarkers(markers) {
        const validatedMarkers = this.validateMarkers(markers, this.get('markers'));
        const sortedMarkers = this.sortMarkers(validatedMarkers);
        this.set('markers', sortedMarkers);
    }
    
    validateEmbedding(parent) {
        return parent.get('shapeType') === ShapeTypes.SWIMLANE;
    }
    
    getLabelEditorStyles(paper) {
        const labelAttrs = this.attr(['label']) || {};
        const textWrap = labelAttrs.textWrap || { width: 0 };
        const backgroundColor = this.attr(['background', 'fill']) || 'white';
        const rx = this.attr(['background', 'rx']) || 0;
        const ry = this.attr(['background', 'ry']) || 0;
        const strokeWidth = this.attr(['border', 'strokeWidth']) || 0;
        
        const { width, height } = this.getBBox();
        const { x, y } = this.getBBox().center();
        
        return {
            padding: `4px ${textWrap.width / -2}px`,
            transform: `${V.matrixToTransformString(paper.matrix().translate(x, y))} translate(-50%, -50%)`,
            transformOrigin: '0 0',
            color: labelAttrs.fill,
            fontSize: `${labelAttrs.fontSize}px`,
            fontFamily: labelAttrs.fontFamily,
            fontWeight: labelAttrs.fontWeight,
            backgroundColor,
            minHeight: `${height + strokeWidth}px`,
            width: `${width + strokeWidth}px`,
            borderRadius: `${rx}px / ${ry}px`
        };
    }
    
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
    }
}

export class Task extends Activity {
    
    static label = ActivityLabels['activity.Task'];
    static icon = activityIconClasses.TASK;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.TASK
        }, super.defaults());
    }
}

export class Send extends Activity {
    
    static label = ActivityLabels['activity.Send'];
    static icon = activityIconClasses.SEND;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.SEND,
            attrs: {
                icon: { iconType: 'send' }
            }
        }, super.defaults());
    }
}

export class BusinessRule extends Activity {
    
    static label = ActivityLabels['activity.BusinessRule'];
    static icon = activityIconClasses.BUSINESS_RULE;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.BUSINESS_RULE,
            attrs: {
                icon: { iconType: 'business-rule' }
            }
        }, super.defaults());
    }
}

export class Receive extends Activity {
    
    static label = ActivityLabels['activity.Receive'];
    static icon = activityIconClasses.RECEIVE;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.RECEIVE,
            attrs: {
                icon: { iconType: 'receive' }
            }
        }, super.defaults());
    }
}

export class Service extends Activity {
    
    static label = ActivityLabels['activity.Service'];
    static icon = activityIconClasses.SERVICE;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.SERVICE,
            attrs: {
                icon: { iconType: 'service' }
            }
        }, super.defaults());
    }
}

export class User extends Activity {
    
    static label = ActivityLabels['activity.User'];
    static icon = activityIconClasses.USER;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.USER,
            attrs: {
                icon: { iconType: 'user' }
            }
        }, super.defaults());
    }
}

export class Manual extends Activity {
    
    static label = ActivityLabels['activity.Manual'];
    static icon = activityIconClasses.MANUAL;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.MANUAL,
            attrs: {
                icon: { iconType: 'manual' }
            }
        }, super.defaults());
    }
}

export class Script extends Activity {
    
    static label = ActivityLabels['activity.Script'];
    static icon = activityIconClasses.SCRIPT;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.SCRIPT,
            attrs: {
                icon: { iconType: 'script' }
            }
        }, super.defaults());
    }
}

export class CallActivity extends Activity {
    
    static label = ActivityLabels['activity.CallActivity'];
    static icon = activityIconClasses.CALL_ACTIVITY;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.CALL_ACTIVITY,
            attrs: {
                border: { borderType: 'thick' },
                markers: { iconTypes: [MarkerNames.SUB_PROCESS] }
            },
            markers: [MarkerNames.SUB_PROCESS]
        }, super.defaults());
    }
    
    validateMarkers(markers, prevMarkers) {
        let idxToRemove = -1;
        if (prevMarkers.includes(MarkerNames.LOOP)) {
            idxToRemove = markers.indexOf(MarkerNames.LOOP);
        }
        if (markers.includes(MarkerNames.LOOP) && !prevMarkers.includes(MarkerNames.LOOP)) {
            const additionalMarkers = markers.includes(MarkerNames.SUB_PROCESS) ? [MarkerNames.SUB_PROCESS] : [];
            return [MarkerNames.LOOP, ...additionalMarkers];
        }
        if (prevMarkers.includes(MarkerNames.PARALLEL)) {
            if (markers.includes(MarkerNames.SEQUENTIAL) || markers.includes(MarkerNames.AD_HOC)) {
                idxToRemove = markers.indexOf(MarkerNames.PARALLEL);
            }
        }
        if (prevMarkers.includes(MarkerNames.SEQUENTIAL)) {
            if (markers.includes(MarkerNames.PARALLEL) || markers.includes(MarkerNames.AD_HOC)) {
                idxToRemove = markers.indexOf(MarkerNames.SEQUENTIAL);
            }
        }
        if (prevMarkers.includes(MarkerNames.AD_HOC)) {
            if (markers.includes(MarkerNames.PARALLEL) || markers.includes(MarkerNames.SEQUENTIAL)) {
                idxToRemove = markers.indexOf(MarkerNames.AD_HOC);
            }
        }
        idxToRemove > -1 && markers.splice(idxToRemove, 1);
        if (markers.includes(MarkerNames.SUB_PROCESS)) {
            return markers;
        }
        return [...markers, MarkerNames.SUB_PROCESS];
    }
    
    getMarkers() {
        return [
            { name: MarkerNames.AD_HOC, index: 0, cssClass: markerClasses.AD_HOC },
            { name: MarkerNames.PARALLEL, index: 1, cssClass: markerClasses.PARALLEL },
            { name: MarkerNames.SEQUENTIAL, index: 2, cssClass: markerClasses.SEQUENTIAL },
            { name: MarkerNames.COMPENSATION, index: 3, cssClass: markerClasses.COMPENSATION },
            { name: MarkerNames.LOOP, index: 4, cssClass: markerClasses.LOOP }
        ];
    }
}

export class SubProcess extends Activity {
    
    static label = ActivityLabels['activity.SubProcess'];
    static icon = activityIconClasses.SUB_PROCESS;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.SUB_PROCESS,
            attrs: {
                markers: { iconTypes: [MarkerNames.SUB_PROCESS] }
            },
            markers: [MarkerNames.SUB_PROCESS]
        }, super.defaults());
    }
    
    validateMarkers(markers, prevMarkers) {
        let idxToRemove = -1;
        if (prevMarkers.includes(MarkerNames.LOOP)) {
            idxToRemove = markers.indexOf(MarkerNames.LOOP);
        }
        if (markers.includes(MarkerNames.LOOP) && !prevMarkers.includes(MarkerNames.LOOP)) {
            return [MarkerNames.LOOP, MarkerNames.SUB_PROCESS];
        }
        if (prevMarkers.includes(MarkerNames.PARALLEL)) {
            if (markers.includes(MarkerNames.SEQUENTIAL) || markers.includes(MarkerNames.AD_HOC)) {
                idxToRemove = markers.indexOf(MarkerNames.PARALLEL);
            }
        }
        if (prevMarkers.includes(MarkerNames.SEQUENTIAL)) {
            if (markers.includes(MarkerNames.PARALLEL) || markers.includes(MarkerNames.AD_HOC)) {
                idxToRemove = markers.indexOf(MarkerNames.SEQUENTIAL);
            }
        }
        if (prevMarkers.includes(MarkerNames.AD_HOC)) {
            if (markers.includes(MarkerNames.PARALLEL) || markers.includes(MarkerNames.SEQUENTIAL)) {
                idxToRemove = markers.indexOf(MarkerNames.AD_HOC);
            }
        }
        idxToRemove > -1 && markers.splice(idxToRemove, 1);
        if (markers.includes(MarkerNames.SUB_PROCESS)) {
            return markers;
        }
        return [...markers, MarkerNames.SUB_PROCESS];
    }
    
    getMarkers() {
        return [
            { name: MarkerNames.AD_HOC, index: 0, cssClass: markerClasses.AD_HOC },
            { name: MarkerNames.PARALLEL, index: 1, cssClass: markerClasses.PARALLEL },
            { name: MarkerNames.SEQUENTIAL, index: 2, cssClass: markerClasses.SEQUENTIAL },
            { name: MarkerNames.COMPENSATION, index: 3, cssClass: markerClasses.COMPENSATION },
            { name: MarkerNames.LOOP, index: 4, cssClass: markerClasses.LOOP }
        ];
    }
}

export class EventSubProcess extends Activity {
    
    static label = ActivityLabels['activity.EventSubProcess'];
    static icon = activityIconClasses.EVENT_SUB_PROCESS;
    
    defaults() {
        return util.defaultsDeep({
            type: ActivityShapeTypes.EVENT_SUB_PROCESS,
            attrs: {
                markers: { iconTypes: [MarkerNames.SUB_PROCESS] },
                border: { borderStyle: 'dotted' }
            },
            markers: [MarkerNames.SUB_PROCESS]
        }, super.defaults());
    }
    
    validateMarkers(markers, prevMarkers) {
        let idxToRemove = -1;
        if (prevMarkers.includes(MarkerNames.LOOP)) {
            idxToRemove = markers.indexOf(MarkerNames.LOOP);
        }
        if (markers.includes(MarkerNames.LOOP) && !prevMarkers.includes(MarkerNames.LOOP)) {
            const additionalMarkers = markers.includes(MarkerNames.SUB_PROCESS) ? [MarkerNames.SUB_PROCESS] : [];
            return [MarkerNames.LOOP, ...additionalMarkers];
        }
        if (prevMarkers.includes(MarkerNames.PARALLEL)) {
            if (markers.includes(MarkerNames.SEQUENTIAL) || markers.includes(MarkerNames.AD_HOC)) {
                idxToRemove = markers.indexOf(MarkerNames.PARALLEL);
            }
        }
        if (prevMarkers.includes(MarkerNames.SEQUENTIAL)) {
            if (markers.includes(MarkerNames.PARALLEL) || markers.includes(MarkerNames.AD_HOC)) {
                idxToRemove = markers.indexOf(MarkerNames.SEQUENTIAL);
            }
        }
        if (prevMarkers.includes(MarkerNames.AD_HOC)) {
            if (markers.includes(MarkerNames.PARALLEL) || markers.includes(MarkerNames.SEQUENTIAL)) {
                idxToRemove = markers.indexOf(MarkerNames.AD_HOC);
            }
        }
        idxToRemove > -1 && markers.splice(idxToRemove, 1);
        if (markers.includes(MarkerNames.SUB_PROCESS)) {
            return markers;
        }
        return [...markers, MarkerNames.SUB_PROCESS];
    }
    
    getMarkers() {
        return [
            { name: MarkerNames.AD_HOC, index: 0, cssClass: markerClasses.AD_HOC },
            { name: MarkerNames.PARALLEL, index: 1, cssClass: markerClasses.PARALLEL },
            { name: MarkerNames.SEQUENTIAL, index: 2, cssClass: markerClasses.SEQUENTIAL },
            { name: MarkerNames.COMPENSATION, index: 3, cssClass: markerClasses.COMPENSATION },
            { name: MarkerNames.LOOP, index: 4, cssClass: markerClasses.LOOP }
        ];
    }
    
    validateConnection(_) {
        return false;
    }
}

Object.assign(shapes, {
    activity: {
        Task,
        Send,
        BusinessRule,
        Receive,
        Service,
        User,
        Script,
        Manual,
        CallActivity,
        SubProcess,
        EventSubProcess
    }
});
