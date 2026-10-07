/**
 * Theme constants for the HDL schematic diagram.
 * The colors follow the default schematic color theme of KiCad.
 */
const Theme = {

    /** Background color of the paper */
    PaperColor: '#F5F4EF',

    /** Color of the grid dots */
    GridColor: '#B5B5B5',

    /** Size of the paper grid. The shapes and their pins are aligned to it. */
    GridSize: 10,

    /** Color of single-bit wires and junctions */
    WireColor: '#009600',

    /** Color of multi-bit wires (buses) */
    BusColor: '#000084',

    /** Width of single-bit wires */
    WireWidth: 1.5,

    /** Width of multi-bit wires (buses) */
    BusWidth: 3,

    /** Radius of the junction dots of single-bit wires */
    JunctionRadius: 3,

    /** Radius of the junction dots of buses (wider wires) */
    BusJunctionRadius: 5,

    /** Color used to highlight wires during preview (e.g., when dragging a new connection) */
    WirePreviewColor: '#0000C2',

    /** Color of wires connecting ports of different widths */
    ErrorColor: '#E00000',

    /** Outline color of the symbols */
    SymbolColor: '#840000',

    /** Fill color of the symbols */
    SymbolFillColor: '#FFFFC2',

    /** Stroke width of the symbol outline */
    SymbolStrokeWidth: 1.5,

    /** Color of the pins */
    PinColor: '#840000',

    /** Color of the pin names */
    PinNameColor: '#006464',

    /** Color of the cell names */
    ReferenceColor: '#006464',

    /** Color of the module ports (KiCad hierarchical labels) */
    ModulePortColor: '#725600',

    /** Color of the constants (KiCad values) */
    ConstantColor: '#840084',

    /** Font family used for all the diagram texts */
    FontFamily: '"JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace',

    /** Average width of a character of the diagram font (used to size the shapes) */
    CharWidth: 6.7,

    /** Default font size */
    FontSize: 11,

    /** Size of the menu tool */
    NodeToolSize: 20,

    /** Margin around the icon inside the menu tool. */
    NodeToolPadding: 0,

    /** Insert tool background color */
    ToolBackgroundColor: '#FFFFFF',

    /** Insert tool border color */
    ToolBorderColor: '#840000',
};

export default Theme;

/** Attributes for the symbol body */
export const symbolBodyAttributes = {
    fill: Theme.SymbolFillColor,
    stroke: Theme.SymbolColor,
    strokeWidth: Theme.SymbolStrokeWidth,
    strokeLinejoin: 'round',
};

/** Attributes for the symbol decorations (e.g. inverting bubbles) */
export const symbolLineAttributes = {
    fill: 'none',
    stroke: Theme.SymbolColor,
    strokeWidth: Theme.SymbolStrokeWidth,
    strokeLinejoin: 'round',
};

/** Attributes for the text inside a symbol */
export const symbolTextAttributes = {
    fontFamily: Theme.FontFamily,
    fontSize: Theme.FontSize,
    fill: Theme.SymbolColor,
    textAnchor: 'middle',
    textVerticalAnchor: 'middle',
    pointerEvents: 'none',
};

/** Attributes for the name displayed below the cell */
export const nodeLabelAttributes = {
    fontFamily: Theme.FontFamily,
    fontSize: 10,
    fill: Theme.ReferenceColor,
    textAnchor: 'middle',
    textVerticalAnchor: 'top',
    pointerEvents: 'none',
};

/** Attributes for the pin line */
export const pinAttributes = {
    fill: 'none',
    stroke: Theme.PinColor,
    strokeWidth: Theme.SymbolStrokeWidth,
    strokeLinecap: 'round',
};

/** Attributes for the pin name */
export const pinNameAttributes = {
    fontFamily: Theme.FontFamily,
    fontSize: 9,
    fill: Theme.PinNameColor,
    textVerticalAnchor: 'middle',
    pointerEvents: 'none',
};

/** Attributes for the port body (the connection hit area) */
export const portBodyAttributes = {
    magnet: true,
    r: 5,
    fill: 'transparent',
    stroke: 'none',
    cursor: 'crosshair',
};

/** Insert tool body attributes */
export const insertToolBodyAttributes = {
    fill: Theme.ToolBackgroundColor,
    stroke: Theme.ToolBorderColor,
    strokeWidth: 1,
    r: 8,
};

/** Insert tool icon attributes */
export const insertToolIconAttributes = {
    pointerEvents: 'none',
    stroke: Theme.ToolBorderColor,
    strokeWidth: 2,
    d: 'M -4 0 4 0 M 0 -4 0 4',
};
