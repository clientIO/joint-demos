/**
 * Theme constants for the Marketing Automation diagram.
 */
const Theme = {
    
    /** Color used to highlight available connection targets */
    AvailableConnectionTargetColor: '#FFE099',
    
    /** Background color of the diagram canvas */
    BackgroundColor: '#F2F4F6',
    
    /** Background color for branches */
    BranchBackgroundColor: '#FFFFFF',
    
    /** Background color for branches in the minimap */
    BranchMinimapBackgroundColor: '#F3D1A3',
    
    /** Border color for branches */
    BranchBorderColor: '#DCDFE5',
    
    /** Background color for branch icons */
    BranchIconBackgroundColor: '#FFFBEB',
    
    /** Slope offset for branches */
    BranchSlopeOffset: 20,
    
    /** Background color of buttons in the diagram. */
    ButtonBackgroundColor: '#E8EAED',
    
    /** Border color of buttons in the diagram. */
    ButtonBorderColor: '#DCDFE5',
    
    /** Color of icons inside buttons in the diagram. */
    ButtonIconColor: '#6E7A91',
    
    /** Margin around the icon inside the button. */
    ButtonIconMargin: 10,
    
    /** Size of the icon inside the button. */
    ButtonIconSize: 12,
    
    /** Color of button lines in the diagram. */
    ButtonLineColor: '#C5CAD3',
    
    /** Dash pattern for button lines in the diagram. */
    ButtonLinePattern: '5, 5',
    
    /** Width of button lines in the diagram. */
    ButtonLineWidth: 1,
    
    /** Size of buttons (to add nodes) in the diagram. */
    ButtonSize: 32,
    
    /** Color used to highlight the current connection target */
    ConnectionTargetColor: '#2187E1',
    
    /** Background color for delays in the minimap */
    DelayMinimapBackgroundColor: '#B089F5',
    
    /** Background color for delay icons */
    DelayIconBackgroundColor: '#F5F3FF',
    
    /** Line color of edges in the diagram. */
    EdgeColor: '#D8DDE4',
    
    /** Text color of edge labels */
    EdgeLabelColor: '#1F2433',
    
    /** Background color of edge labels */
    EdgeLabelBackgroundColor: '#EFFDF6',
    
    /** Border color of edge labels */
    EdgeLabelBorderColor: '#CFCFCF',
    
    /** Horizontal padding inside edge labels */
    EdgeLabelHorizontalPadding: 10,
    
    /** Vertical padding inside edge labels */
    EdgeLabelVerticalPadding: 6,
    
    /** Color used to highlight edges during preview (e.g., when dragging a new connection) */
    EdgePreviewColor: '#424ED2',
    
    /** Width of edges in the diagram. */
    EdgeWidth: 2,
    
    /** Dynamic color used for animating edges when the flow is tested */
    FlowColorDynamic: '#4FBA95',
    
    /** Static color used for animating edges when the flow is tested */
    FlowColorStatic: '#E2F4ED',
    
    /** Gradient stops for the pulse effect used for animating node's outline when the flow is tested */
    FlowPulseGradientStops: [
        { offset: '0%', color: '#C3EBDB' },
        { offset: '34%', color: '#4FBA95' },
        { offset: '66%', color: '#CCEFE1' },
        { offset: '91%', color: '#96D6C0' },
    ],
    
    /** Font family used throughout the diagram */
    FontFamily: 'Inter, sans-serif',
    
    /** Border color for node icon backgrounds */
    IconBackgroundBorderColor: '#EEEFF2',
    
    /** Border width for icon backgrounds. */
    IconBackgroundBorderWidth: 1,
    
    /** Background color for node icons (unless custom color is provided) */
    IconBackgroundColor: '#F8FAFC',
    
    /** Icon background radius for images in shapes. */
    IconBackgroundRadius: 10,
    
    /** Icon background size for images in shapes. */
    IconBackgroundSize: 32,
    
    /** Spacing between icon and label. */
    IconLabelSpacing: 12,
    
    /** Icon size for images in shapes. */
    IconSize: 20,
    
    /** Background color for nodes */
    NodeBackgroundColor: '#FFFFFF',
    
    /** Background color for nodes in the minimap (unless custom color is provided) */
    NodeMinimapBackgroundColor: '#E6E8F0',
    
    /** Border color for nodes */
    NodeBorderColor: '#DCDFE5',
    
    /** Border radius for nodes in the diagram. */
    NodeBorderRadius: 12,
    
    /** Border width for nodes in the diagram. */
    NodeBorderWidth: 1,
    
    /** Height of all nodes in the diagram (except triggers). */
    NodeHeight: 62,
    
    /** Horizontal padding for shapes. */
    NodeHorizontalPadding: 12,
    
    /** Text color for nodes */
    NodeLabelColor: '#1F2433',
    
    /** Size of the menu tool */
    NodeToolSize: 24,
    
    /** Margin around the icon inside the menu tool. */
    NodeToolPadding: 4,
    
    /** Text color for node type labels */
    NodeTypeLabelColor: '#707A8F',
    
    /** Vertical padding for shapes. */
    NodeVerticalPadding: 12,
    
    /** Width of all nodes in the diagram. */
    NodeWidth: 252,
    
    /** Background color of notes in the diagram */
    NoteBackgroundColor: '#FEF3C7',
    
    /** Border color of notes in the diagram */
    NoteBorderColor: '#FFE388',
    
    /** Background color for notes in the minimap */
    NoteMinimapBackgroundColor: '#F1F0D7',
    
    /** Padding inside notes in the diagram */
    NotePadding: 16,
    
    /** Color of the note text in the diagram */
    NoteTextColor: '#4E423C',
    
    /** Border color for placeholders in the diagram. */
    PlaceholderBorderColor: '#B8CACD',
    
    /** Border dash pattern for placeholders in the diagram. */
    PlaceholderBorderPattern: '6, 6',
    
    /** Border width for placeholders in the diagram. */
    PlaceholderBorderWidth: 1,
    
    /** Color used to highlight selected elements and edges */
    SelectionColor: '#3F4EDA',
    
    /** The vertical margin applied to both typeLabel and label to separate them vertically. */
    TextVerticalMargin: 3,
    
    /** Height of the "Add criteria" button in triggers */
    TriggerAddButtonHeight: 28,
    
    /** Background color for trigger buttons */
    TriggerButtonBackgroundColor: '#3F4EDA',
    
    /** Text color for trigger button labels */
    TriggerButtonLabelColor: '#FFFFFF',
    
    /** Gap between trigger criteria fields */
    TriggerCriteriaGap: 8,
    
    /** Size of the trigger criteria field */
    TriggerCriteriaHeight: 26,
    
    /** Size of the trigger criteria delete button */
    TriggerCriteriaDeleteButtonSize: 16,
    
    /** Size of the trigger criteria icon */
    TriggerCriteriaIconSize: 16,
    
    /** Margin around the trigger criteria icon. */
    TriggerCriteriaIconMargin: 4,
    
    /** Background color for triggers in the minimap */
    TriggerMinimapBackgroundColor: '#B1B1F5',
    
    /** Background color for trigger icons */
    TriggerIconBackgroundColor: '#EEF2FF',
    
    /** Size of the warning effect, displayed on non-configured nodes */
    WarningIconSize: 24,
};

export default Theme;

/** Attributes for the main label on nodes */
export const nodeLabelAttributes = {
    fontSize: 13,
    fontWeight: 500,
    fontFamily: Theme.FontFamily,
    textVerticalAnchor: 'top',
    textAnchor: 'start',
    lineHeight: '1em',
    x: Theme.NodeHorizontalPadding + Theme.IconBackgroundSize + Theme.IconLabelSpacing,
    y: Theme.NodeHeight / 2 + Theme.TextVerticalMargin,
    fill: Theme.NodeLabelColor,
};

/** Attributes for the labels indicating the type of node */
export const typeLabelAttributes = {
    fontSize: 12,
    fontWeight: 400,
    fontFamily: Theme.FontFamily,
    textVerticalAnchor: 'bottom',
    textAnchor: 'start',
    lineHeight: '1em',
    x: Theme.NodeHorizontalPadding + Theme.IconBackgroundSize + Theme.IconLabelSpacing,
    y: Theme.NodeHeight / 2 - Theme.TextVerticalMargin,
    fill: Theme.NodeTypeLabelColor,
};

/** Attributes for the labels on edges */
export const edgeLabelAttributes = {
    fontFamily: Theme.FontFamily,
    fontSize: 13,
};

/** Attributes for the rectangular body of a node */
export const rectBodyAttributes = {
    width: 'calc(w)',
    height: 'calc(h)',
    fill: Theme.NodeBackgroundColor,
    stroke: Theme.NodeBorderColor,
    strokeWidth: Theme.NodeBorderWidth,
    rx: Theme.NodeBorderRadius,
    ry: Theme.NodeBorderRadius
};

/** Attributes for the icon background inside a node */
export const iconBackgroundAttributes = {
    x: Theme.NodeHorizontalPadding,
    y: (Theme.NodeHeight - Theme.IconBackgroundSize) / 2,
    width: Theme.IconBackgroundSize,
    height: Theme.IconBackgroundSize,
    rx: Theme.IconBackgroundRadius,
    ry: Theme.IconBackgroundRadius,
    fill: Theme.IconBackgroundColor,
    stroke: Theme.IconBackgroundBorderColor,
    strokeWidth: Theme.IconBackgroundBorderWidth,
};

/** Attributes for the icon inside a node */
export const iconAttributes = {
    x: Theme.NodeHorizontalPadding + (Theme.IconBackgroundSize - Theme.IconSize) / 2,
    y: (Theme.NodeHeight - Theme.IconSize) / 2,
    width: Theme.IconSize,
    height: Theme.IconSize
};

/** Attributes for the button body */
export const buttonBodyAttributes = {
    r: Theme.ButtonSize / 2,
    stroke: Theme.ButtonBorderColor,
    fill: Theme.ButtonBackgroundColor,
    strokeWidth: 1,
};

/** Attributes for the button icon */
export const buttonIconAttributes = {
    pointerEvents: 'none',
    d: `
        M ${-Theme.ButtonIconSize / 2} 0
        L ${Theme.ButtonIconSize / 2} 0
        M 0 ${-Theme.ButtonIconSize / 2}
        L 0 ${Theme.ButtonIconSize / 2}
    `,
    stroke: Theme.ButtonIconColor,
    strokeWidth: 1.5,
    strokeLinecap: 'round',
};
