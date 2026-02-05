import { useRef, useEffect } from 'react';
import jointjsLogo from '/assets/icons/joint-js.svg';

import { StencilService } from './services/stencil-service';
import { ToolbarService } from './services/toolbar-service';
import { InspectorService } from './services/inspector-service';
import { HaloService } from './services/halo-service';
import { KeyboardService } from './services/keyboard-service';
import { NavigatorService } from './services/navigator-service';
import RappidService from './services/kitchensink-service';

import { sampleGraphs } from './config/sample-graphs';

function Rappid() {
    const rappid = useRef<RappidService>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    // Containers
    const paperContainer = useRef<HTMLDivElement>(null);
    const stencilContainer = useRef<HTMLDivElement>(null);
    const toolbarContainer = useRef<HTMLDivElement>(null);
    const inspectorContainer = useRef<HTMLDivElement>(null);
    const navigatorContainer = useRef<HTMLDivElement>(null);

    // Additional inspector elements
    const openGroupsButton = useRef<HTMLButtonElement>(null);
    const closeGroupsButton = useRef<HTMLButtonElement>(null);
    const inspectorHeader = useRef<HTMLDivElement>(null);
    const inspectorContent = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const services = {
            stencilService: new StencilService(stencilContainer.current),
            toolbarService: new ToolbarService(toolbarContainer.current),
            inspectorService: new InspectorService({
                openGroupsButton: openGroupsButton.current,
                closeGroupsButton: closeGroupsButton.current,
                container: inspectorContainer.current,
                header: inspectorHeader.current,
                content: inspectorContent.current,
            }),
            haloService: new HaloService(),
            keyboardService: new KeyboardService(),
            navigatorService: new NavigatorService(navigatorContainer.current),
        };

        rappid.current = new RappidService(
            elementRef.current!,
            paperContainer.current!,
            services
        );

        rappid.current.startRappid();

        rappid.current.graph.fromJSON(
            JSON.parse(sampleGraphs.emergencyProcedure),
            { ignoreUndoRedo: true }
        );
    }, []);

    return (
        <div id="app" className="joint-app">
            <div className="app-header">
                <img src={jointjsLogo} alt="JointJS" />
            </div>
            <div ref={toolbarContainer} className="toolbar-container"></div>
            <div className="app-body">
                <div ref={stencilContainer} className="stencil-container"></div>
                <div ref={paperContainer} className="paper-container"></div>
                <div ref={inspectorContainer} className="inspector-container">
                    <div
                        ref={inspectorHeader}
                        className="inspector-header hidden"
                    >
                        <button
                            ref={openGroupsButton}
                            className="open-groups-btn"
                        ></button>
                        <button
                            ref={closeGroupsButton}
                            className="close-groups-btn"
                        ></button>
                        <span className="inspector-header-text">
                            Properties
                        </span>
                    </div>
                    <div
                        ref={inspectorContent}
                        className="inspector-content"
                    ></div>
                </div>
                <div
                    ref={navigatorContainer}
                    className="navigator-container"
                ></div>
            </div>
        </div>
    );
}

export default Rappid;
