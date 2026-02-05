import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { dia, shapes } from '@joint/plus';
import { Subscription } from 'rxjs';

import MessageInspector from './MessageInspector';
import './Inspector.scss';
import LinkInspector from './LinkInspector';
import LabelInspector from './LabelInspector';
import eventBusServiceContext from '../../../services/event-bus-service.context';
import { SharedEvents } from '../../../joint-plus/controller';
import { ShapeTypesEnum } from '../../../joint-plus/shapes/app.shapes';

const Inspector = (): ReactElement => {
    const [cell, setCell] = useState<dia.Cell>(null);
    const [subscriptions] = useState(new Subscription());
    const eventBusService = useContext(eventBusServiceContext);

    const setSelection = (selection: dia.Cell[]): void => {
        const [selectedCell = null] = selection;
        setCell(selectedCell);
    };

    useEffect(() => {
        subscriptions.add(
            eventBusService.subscribe(SharedEvents.SELECTION_CHANGED, (selection: dia.Cell[]) => setSelection(selection))
        );
        return () => {
            subscriptions.unsubscribe();
        };
    }, [eventBusService, subscriptions]);

    const chooseInspector = (): ReactElement => {
        switch (cell.get('type')) {
            case ShapeTypesEnum.MESSAGE:
                return <MessageInspector cell={cell as shapes.app.Message}/>
            case ShapeTypesEnum.LINK:
                return <LinkInspector cell={cell as dia.Link}/>;
            case ShapeTypesEnum.FLOWCHART_START:
                return <LabelInspector cell={cell}/>;
            case ShapeTypesEnum.FLOWCHART_END:
                return <LabelInspector cell={cell}/>;
            default:
                return;
        }
    };

    const emptyInspector = (): ReactElement => {
        return (
            <>
                <h1>Component</h1>
                <label htmlFor="label">Label</label>
                <input disabled id="label"/>
            </>
        );
    };

    return (
        <div className={'chatbot-inspector ' + (!cell ? 'disabled-chatbot-inspector' : '')}>
            {
                cell ? chooseInspector() : emptyInspector()
            }
        </div>
    );
};

export default Inspector;
