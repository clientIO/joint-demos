import { Attribute as SystemAttribute } from '../system/diagram/const';
export { LAYOUT_BATCH_NAME } from '../system/diagram/const';

/**
 * Node attribute names
 */
export const Attribute = {

    // Re-export system attributes
    ...SystemAttribute,

    /**
     * Can a shape be selected?
     */
    Selectable: 'selectable',
    /**
     * Does the shape have a context menu?
     */
    ContextMenu: 'contextMenu',
    /**
     * Is the shape removable?
     */
    Removable: 'removable',
    /**
     * Name of the module port, the cell or the net.
     */
    Name: 'name',
    /**
     * Width in bits of a module port or a constant.
     */
    Width: 'width',
    /**
     * Binary value (MSB first) of a constant.
     */
    Value: 'value',
    /**
     * Yosys cell type (e.g. `$and`).
     */
    CellType: 'cellType',
    /**
     * Normalized cell parameters (see `registry`).
     */
    Parameters: 'parameters',
    /**
     * Yosys attributes of the cell (e.g. `src`), preserved for the export.
     */
    CellAttributes: 'cellAttributes',
    /**
     * Ports of a generic block (cells without a registry definition).
     */
    CellPorts: 'cellPorts',
    /**
     * Bit ranges of the split / join nodes.
     */
    Ranges: 'ranges',
    /**
     * Names of the nets driven by the node output ports.
     */
    NetNames: 'netNames',
    /**
     * Width in bits of the wire (edge).
     */
    BusWidth: 'busWidth',
    /**
     * Distance of the bus width label from the wire source.
     */
    BusLabelDistance: 'busLabelDistance',
    /**
     * The widths of the connected ports do not match.
     */
    WidthMismatch: 'widthMismatch',
} as const;

/**
 * Diagram node types
 */
export const NodeTypes = {
    Input: 'hdl.Input',
    Output: 'hdl.Output',
    Constant: 'hdl.Constant',
    Gate: 'hdl.Gate',
    Operator: 'hdl.Operator',
    Mux: 'hdl.Mux',
    Register: 'hdl.Register',
    Split: 'hdl.Split',
    Join: 'hdl.Join',
    Block: 'hdl.Block',
} as const;
