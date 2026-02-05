import { linkTools, util } from '@joint/plus';
import { MAIN_COLOR } from './theme';

const BPMNSourceArrowhead = linkTools.SourceArrowhead.extend({
    name: 'bpmn-source-arrowhead',
    tagName: 'ellipse',
    attributes: {
        rx: 6,
        ry: 6,
        fill: MAIN_COLOR,
        stroke: null
    }
});

const BPMNTargetArrowhead = linkTools.TargetArrowhead.extend({
    name: 'bpmn-target-arrowhead',
    tagName: 'ellipse',
    attributes: {
        rx: 6,
        ry: 6,
        fill: MAIN_COLOR,
        stroke: null
    }
});

const removeButtonMarkup = util.svg `
    <circle @selector="button" r="7" fill="#969696" cursor="pointer" />
    <path @selector="icon" d="M -3 -3 3 3 M -3 3 3 -3" fill="none" stroke="#FFFFFF" stroke-width="2" pointer-events="none" />
`;

export const constructLinkTools = {
    SourceArrowHead: () => new BPMNSourceArrowhead({
        focusOpacity: 0.5
    }),
    TargetArrowHead: () => new BPMNTargetArrowhead({
        focusOpacity: 0.5
    }),
    DoubleRemove: () => {
        return [
            new linkTools.Remove({
                markup: removeButtonMarkup,
                distance: (linkView) => linkView.getConnectionLength() > 200 ? 40 : '50%'
            }),
            new linkTools.Remove({
                markup: removeButtonMarkup,
                distance: -40,
                visibility: (linkView) => linkView.getConnectionLength() > 200
            })
        ];
    },
    Vertices: () => new linkTools.Vertices({
        snapRadius: 10
    })
};
