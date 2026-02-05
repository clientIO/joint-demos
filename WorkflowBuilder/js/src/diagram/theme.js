/**
 * Theme constants for the Generic Workflow Builder diagram.
 */
const Theme = {
    
    /* * Background color for control nodes */
    ControlBackgroundColor: '#F1FBED',
    
    /** Border color for control nodes */
    ControlBorderColor: '#9AD5A3',
    
    /** Border width for control nodes in the diagram. */
    ControlBorderWidth: 1,
    
    /** Outline color for control nodes */
    ControlOutlineColor: '#D7E8D0',
    
    /** Border color of edges in the diagram. */
    EdgeColor: '#B8CACD',
    
    /** Color used to highlight edges during preview (e.g., when dragging a new connection) */
    EdgePreviewColor: '#275EE7',
    
    /** Width of edges in the diagram. */
    EdgeWidth: 2,
    
    /** Font family used throughout the diagram */
    FontFamily: 'Inter, sans-serif',
    
    /** Icon size for images in shapes. */
    IconSize: 38,
    
    /** Input port background color */
    InPortBackgroundColor: '#FFFFFF',
    
    /** Input port border color */
    InPortBorderColor: '#275EE7',
    
    /** Input port border width */
    InPortBorderWidth: 3,
    
    /** Background color for nodes */
    NodeBackgroundColor: '#FFFFFF',
    
    /** Border color for nodes */
    NodeBorderColor: '#BECDF4',
    
    /** Border width for nodes in the diagram. */
    NodeBorderWidth: 1,
    
    /** Text color for nodes */
    NodeLabelColor: '#333333',
    
    /** Outline color for nodes */
    NodeOutlineColor: '#CFDCEF',
    
    /** Size of the menu tool */
    NodeToolSize: 24,
    
    /** Margin around the icon inside the menu tool. */
    NodeToolPadding: 0,
    
    /** Text color for node type labels */
    NodeTypeLabelColor: '#6E7A91',
    
    /** Background color for notes */
    NoteBackgroundColor: '#F6EEB8',
    
    /** Border color for notes */
    NoteBorderColor: '#BECDF4',
    
    /** Border radius for notes */
    NoteBorderRadius: 14,
    
    /** Note content padding */
    NotePadding: 16,
    
    /** Text color for notes */
    NoteTextColor: '#333333',
    
    /** Output port background color */
    OutPortBackgroundColor: '#D8E3F2',
    
    /** Output port border color */
    OutPortBorderColor: '#BECDF4',
    
    /** Output port border width */
    OutPortBorderWidth: 1,
    
    /** Output port icon color */
    OutPortIconColor: '#8BA2DB',
    
    /** Color for trigger marker */
    TriggerMarkerColor: '#454B6E',
};

export default Theme;

/** Attributes for the main label on nodes */
export const nodeLabelAttributes = {
    fontSize: 14,
    fontWeight: 500,
    fontFamily: Theme.FontFamily,
    textVerticalAnchor: 'top',
    textAnchor: 'middle',
    lineHeight: '1.2em',
    fill: Theme.NodeLabelColor,
    pointerEvents: 'none',
};

/** Attributes for the type label on nodes */
export const nodeTypeLabelAttributes = {
    fill: Theme.NodeTypeLabelColor,
    fontSize: 13,
    fontWeight: 400,
    fontFamily: Theme.FontFamily,
    textVerticalAnchor: 'top',
    textAnchor: 'middle',
    pointerEvents: 'none',
};

/** Attributes for the icon inside a node */
export const iconAttributes = {
    width: Theme.IconSize,
    height: Theme.IconSize
};

/** Attributes for the input port body */
export const inPortBodyAttributes = {
    magnet: true,
    fill: Theme.InPortBackgroundColor,
    stroke: Theme.InPortBorderColor,
    strokeWidth: Theme.InPortBorderWidth,
    r: 5,
};

/** Attributes for the output port body */
export const outPortBodyAttributes = {
    magnet: true,
    stroke: Theme.OutPortBorderColor,
    fill: Theme.OutPortBackgroundColor,
    strokeWidth: Theme.OutPortBorderWidth,
    r: 9
};

/** Attributes for the output port icon */
export const outPortIconAttributes = {
    pointerEvents: 'none',
    fill: Theme.OutPortIconColor,
    fontFamily: Theme.FontFamily,
    fontWeight: 700,
    text: '+',
    textAnchor: 'middle',
    textVerticalAnchor: 'middle',
};

/** Attributes for the port label */
export const portLabelAttributes = {
    fontFamily: Theme.FontFamily,
    fontWeight: 400,
    fontSize: 11,
    pointerEvents: 'none',
    textVerticalAnchor: 'top',
};

/** Insert tool body attributes */
export const insertToolBodyAttributes = {
    fill: Theme.OutPortBackgroundColor,
    stroke: Theme.OutPortBorderColor,
    strokeWidth: Theme.OutPortBorderWidth,
    r: 9,
};

/** Insert tool icon attributes */
export const insertToolIconAttributes = {
    pointerEvents: 'none',
    stroke: Theme.OutPortIconColor,
    strokeWidth: 2,
    d: 'M -4 0 4 0 M 0 -4 0 4',
};
