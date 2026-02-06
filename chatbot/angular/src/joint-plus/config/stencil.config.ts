/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import {
    CONFIRMATION_ICON,
    ENTITY_ICON,
    MESSAGE_ICON,
    USER_INPUT_ICON
} from '../../theme';

export const stencilConfig = {
    shapes: [{
        name: 'FlowchartStart'
    }, {
        name: 'FlowchartEnd'
    }, {
        name: 'Message',
        attrs: {
            label: { text: 'User action' },
            icon: { xlinkHref: USER_INPUT_ICON }
        }
    }, {
        name: 'Message',
        attrs: {
            label: { text: 'Entity' },
            icon: { xlinkHref: ENTITY_ICON }
        }
    }, {
        name: 'Message',
        attrs: {
            label: { text: 'Message' },
            icon: { xlinkHref: MESSAGE_ICON }
        }
    }, {
        name: 'Message',
        attrs: {
            label: { text: 'Confirmation' },
            icon: { xlinkHref: CONFIRMATION_ICON }
        }
    }]
};
