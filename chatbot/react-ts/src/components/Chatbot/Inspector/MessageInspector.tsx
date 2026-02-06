import React, { ChangeEvent, ReactElement, useCallback, useState } from 'react';
import { shapes } from '@joint/plus';

import { useBaseInspector } from './useBaseInspector';
import Input from '../Input/Input';

interface Props {
    cell: shapes.app.Message;
}

interface InspectorPort {
    id: string;
    label: string;
}

const cellProps = {
    label: ['attrs', 'label', 'text'],
    description: ['attrs', 'description', 'text'],
    icon: ['attrs', 'icon', 'xlinkHref'],
    portLabel: ['attrs', 'portLabel', 'text']
};

const MessageInspector = (props: Props): ReactElement => {

    const { cell } = props;

    const [label, setLabel] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [icon, setIcon] = useState<string>('');
    const [ports, setPorts] = useState<InspectorPort[]>([]);
    const [canAddPort, setCanAddPort] = useState<boolean>(false);

    const assignFormPorts = useCallback((): void => {
        setCanAddPort(cell.canAddPort('out'));
        setPorts(cell.getGroupPorts('out').map(({ id }) => {
            return {
                id,
                label: cell.portProp(id, cellProps.portLabel)
            };
        }));
    }, [cell]);

    const assignFormFields = useCallback((): void => {
        setLabel(cell.prop(cellProps.label));
        setDescription(cell.prop(cellProps.description));
        setIcon(cell.prop(cellProps.icon));
        assignFormPorts();
    }, [cell, assignFormPorts]);

    const changeCellProp = useBaseInspector({ cell, assignFormFields });

    const addCellPort = (): void => {
        cell.addDefaultPort();
        assignFormPorts();
    };

    const removeCellPort = (portId: string): void => {
        cell.removePort(portId);
        assignFormPorts();
    };

    const changeCellPort = (port: InspectorPort, value: string): void => {
        cell.portProp(port.id, cellProps.portLabel, value);
    };

    return (
        <>
            <h1>Component</h1>

            <label htmlFor="label">Label</label>
            <Input id="label"
                   type="text"
                   placeholder="Enter label"
                   value={label}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => changeCellProp(cellProps.label, e.target.value)}
            />
            <label htmlFor="description">Description</label>
            <Input id="description"
                   type="text"
                   placeholder="Enter description"
                   value={description}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => changeCellProp(cellProps.description, e.target.value)}
            />
            <label htmlFor="icon">Icon (Base64)</label>
            <span className="icon-input"/>
            <Input id="icon"
                   type="text"
                   placeholder="Enter icon"
                   value={icon}
                   spellCheck={false}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => changeCellProp(cellProps.icon, e.target.value)}
            />
            <div className="ports">
                <div className="out-ports-bar">
                    <span>Out Ports</span>
                    <button disabled={!canAddPort}
                            onClick={addCellPort}
                            className="add-port"
                            data-tooltip="Add Output Port">
                    </button>
                </div>
                {ports.map(port => {
                    return (
                        <div key={port.id} className="port">
                            <Input defaultValue={port.label}
                                   onChange={(e: ChangeEvent<HTMLInputElement>) => changeCellPort(port, e.target.value)}
                            />
                            <button className="remove-port"
                                    onClick={() => removeCellPort(port.id)}
                                    data-tooltip="Remove Output Port">
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default MessageInspector;
