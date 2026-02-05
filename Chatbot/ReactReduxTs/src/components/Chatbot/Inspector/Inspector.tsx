import React, { ReactElement, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { dia, shapes } from '@joint/plus';

import MessageInspector from './MessageInspector';
import './Inspector.scss';
import LinkInspector from './LinkInspector';
import LabelInspector from './LabelInspector';
import { ShapeTypesEnum } from '../../../joint-plus/shapes/app.shapes';
import { State } from '../../../redux/reducer';

const Inspector = (): ReactElement => {
    const [cell, setCell] = useState<dia.Cell>(null);

    const selection = useSelector((state: State) => state.selection);

    useEffect(() => {
        const [selectedCell = null] = selection as dia.Cell[];
        setCell(selectedCell);
    }, [selection]);

    const chooseInspector = (): ReactElement => {
        switch (cell.get('type')) {
            case ShapeTypesEnum.MESSAGE:
                return <MessageInspector cell={cell as shapes.app.Message}/>;
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
                <label>Label
                    <input disabled/>
                </label>
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
