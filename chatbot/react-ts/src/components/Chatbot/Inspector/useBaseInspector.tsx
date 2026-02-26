import { useCallback, useEffect, useState } from 'react';
import type { dia } from '@joint/plus';

interface Props {
    cell: dia.Cell;
    assignFormFields: () => void;
}

export const useBaseInspector = (props: Props): ((path: dia.Path, value: unknown) => void) => {

    const { cell, assignFormFields } = props;

    const [context] = useState({ id: cell.id });

    const addCellListener = useCallback((): void => {
        cell.on('change', () => assignFormFields(), context);
    }, [cell, assignFormFields, context]);

    const removeCellListener = useCallback((): void => {
        cell.off(null, null, context);
    }, [cell, context]);

    const changeCellProp = (path: dia.Path, value: unknown): void => {
        cell.prop(path, value);
    };

    useEffect(() => {
        addCellListener();
        assignFormFields();
        return () => {
            removeCellListener();
        };
    }, [assignFormFields, addCellListener, removeCellListener]);

    return changeCellProp;
};
