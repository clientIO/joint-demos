import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import './Chatbot.scss';
import JointPlusService from '../../services/joint-plus.service';
import JsonEditor from './JsonEditor/JsonEditor';
import Inspector from './Inspector/Inspector';
import { importGraphFromJSON, loadStencilShapes, zoomToFit } from '../../joint-plus/actions';
import { STENCIL_WIDTH } from '../../theme';
import { State } from '../../redux/reducer';

import exampleGraphJSON from '../../joint-plus/config/example-graph.json';

const Chatbot = (): ReactElement => {

    const elementRef = useRef(null);
    const toolbarRef = useRef(null);
    const stencilRef = useRef(null);
    const paperRef = useRef(null);

    const [joint, setJoint] = useState(null);
    const [stencilOpened, setStencilOpened] = useState(true);
    const [jsonEditorOpened, setJsonEditorOpened] = useState(true);
    const [fileJSON, setFileJSON] = useState(null);

    const dispatch = useDispatch();

    const graphJSON = useSelector<State>(state => {
        return state.graphJSON;
    });

    useEffect(() => {
        setFileJSON(graphJSON);
    }, [graphJSON]);

    const openFile = useCallback((json: Object): void => {
        setFileJSON(json);
        importGraphFromJSON(joint, json);
        zoomToFit(joint);
    }, [joint]);

    const onStart = useCallback((): void => {
        loadStencilShapes(joint);
        openFile(exampleGraphJSON);
    }, [joint, openFile]);

    const onStencilToggle = useCallback((): void => {
        if (!joint) {
            return;
        }
        const { scroller, stencil } = joint;
        if (stencilOpened) {
            stencil.unfreeze();
            scroller.el.scrollLeft += STENCIL_WIDTH;
        } else {
            stencil.freeze();
            scroller.el.scrollLeft -= STENCIL_WIDTH;
        }
    }, [joint, stencilOpened]);

    const toggleJsonEditor = (): void => {
        setJsonEditorOpened(!jsonEditorOpened);
    };

    const toggleStencil = (): void => {
        setStencilOpened(!stencilOpened);
    };

    useEffect((): void => {
        onStencilToggle();
    }, [stencilOpened, onStencilToggle]);

    const setStencilContainerSize = useCallback((): void => {
        stencilRef.current.style.width = `${STENCIL_WIDTH}px`;
    }, []);

    useEffect(() => {
        setJoint(new JointPlusService(
            elementRef.current,
            paperRef.current,
            stencilRef.current,
            toolbarRef.current,
            dispatch
        ));
    }, [dispatch]);

    useEffect(() => {
        if (!joint) {
            return;
        }
        setStencilContainerSize();
        onStart();
    }, [joint, onStart, setStencilContainerSize, dispatch]);

    useEffect(() => {
        if (!joint) {
            return;
        }
        return () => {
            joint.destroy();
        };
    }, [joint]);

    return (
        <div ref={elementRef} className="joint-scope chatbot">
            <div ref={toolbarRef}/>
            <div className="side-bar">
                <div className="toggle-bar">
                    <div onClick={toggleStencil}
                         className={'icon toggle-stencil ' + (!stencilOpened ? 'disabled-icon' : '')}
                         data-tooltip="Toggle Element Palette"
                         data-tooltip-position-selector=".toggle-bar"/>
                    <div onClick={toggleJsonEditor}
                         className={'icon toggle-editor ' + (!jsonEditorOpened ? 'disabled-icon' : '')}
                         data-tooltip="Toggle JSON Editor"
                         data-tooltip-position-selector=".toggle-bar"/>
                </div>
                <div ref={stencilRef}
                     style={{ display: stencilOpened ? 'initial' : 'none' }}
                     className="stencil-container"/>
            </div>
            <div className="main-container">
                <div ref={paperRef} className="paper-container"/>
                <div style={{ display: jsonEditorOpened ? 'initial' : 'none' }}>
                    <JsonEditor content={fileJSON}/>
                </div>
            </div>
            <Inspector/>
        </div>
    );
};

export default Chatbot;
