/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { dia } from '@joint/plus';

import './app.shapes';
import './stencil.shapes';

// extend joint.shapes namespace
declare module '@joint/plus' {
    namespace shapes {
        namespace app {
            class Base extends dia.Element {
                static fromStencilShape(element: dia.Element): Base;
                getBoundaryPadding(): dia.PaddingJSON;
            }
            class Message extends Base {
                addDefaultPort(): void;
                canAddPort(group: string): boolean;
                toggleAddPortButton(group: string): void;
            }
            class FlowchartStart extends Base {
            }
            class FlowchartEnd extends Base {
            }
            class Link extends dia.Link {
            }
        }
        namespace stencil {
            class Message extends dia.Element {
            }
            class FlowchartStart extends dia.Element {
            }
            class FlowchartEnd extends dia.Element {
            }
        }
    }
}
