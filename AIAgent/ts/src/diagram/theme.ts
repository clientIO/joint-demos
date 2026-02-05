import type { dia } from '@joint/plus';

/**
 * Theme constants for the AI Agent diagram.
 */
const Theme = {

    /** Background color of the Action node */
    ActionBackgroundColor: '#FFFFFF',

    /** Border color of the Action node */
    ActionBorderColor: '#DCDFE5',

    /** Border width of the Action node */
    ActionBorderWidth: 1,

    /** Background color of the Agent node */
    AgentBackgroundColor: '#FFFFFF',

    /** Gap between the Agent node body and the emphasized border */
    AgentBorderGap: 5,

    /** Color of the inner border of the Agent node */
    AgentBorderColor: '#D2D8E0',

    /** Width of the inner border of the Agent node */
    AgentBorderWidth: 1,

    /** Emphasized border color of the Agent node */
    AgentEmphasizedBorderColor: {
        type: 'linearGradient',
        stops: [
            { offset: 0, color: '#C29D4C' },
            { offset: 0.25, color: '#F8CB81' },
            { offset: 0.5, color: '#DE2575' },
            { offset: 0.75, color: '#E87A35' },
            { offset: 1, color: '#D14EC8' },
        ]
    } as dia.SVGGradientJSON,

    /** Emphasized border width of the Agent node */
    AgentEmphasizedBorderWidth: 2,

    /** Height of the Agent node */
    AgentHeight: 160,

    /** Color used to highlight separators in the diagram */
    AgentSeparatorColor: '#D6E0E7',

    /** Width of separators in the diagram */
    AgentSeparatorWidth: 2,

    /** Size of the icon inside the add skill button in the Agent node */
    AgentSkillButtonIconSize: 14,

    /** Size of the add skill button inside the Agent node */
    AgentSkillButtonSize: 30,

    /** Text color of the add skill button label inside the Agent node */
    AgentSkillButtonLabelColor: '#9CA7A9',

    /** Size of each skill icon inside the Agent node */
    AgentSkillSize: 31,

    /** Text color of the skills label inside the Agent node */
    AgentSkillsLabelColor: '#9CA7A9',

    /** Color used to highlight available connection targets */
    AvailableConnectionTargetColor: '#FFE099',

    /** Background color of the diagram canvas */
    BackgroundColor: '#F6F6F6',

    /** Border color of buttons in the diagram. */
    ButtonBorderColor: '#A5ADB6',

    /** Background color of buttons in the diagram. */
    ButtonBackgroundColor: '#FFFFFF',

    /** Color of icons inside buttons in the diagram */
    ButtonIconColor: '#A5ADB6',

    /** Size of the icon inside the button. */
    ButtonIconSize: 10,

    /** Color of button line in the diagram */
    ButtonLineColor: '#A5ADB6',

    /** Dash pattern for button lines in the diagram. */
    ButtonLinePattern: '5, 5',

    /** Width of button lines in the diagram. */
    ButtonLineWidth: 1,

    /** Size of buttons in the diagram */
    ButtonSize: 26,

    /** Background color of the Condition node */
    ConditionBackgroundColor: '#E5F4E4',

    /** Border color of the Condition node */
    ConditionBorderColor: '#71B08B',

    /** Border width of the Condition node */
    ConditionBorderWidth: 1,

    /** Height of the Condition node */
    ConditionHeight: 45,

    /** Width of the Condition node */
    ConditionWidth: 177,

    /** Color used to highlight the current connection target */
    ConnectionTargetColor: '#2187E1',

    /** Line color of edges in the diagram */
    EdgeColor: '#A5ADB6',

    /** Border radius of edge labels */
    EdgeLabelBorderRadius: 6,

    /** Background color of edge labels */
    EdgeLabelBackgroundColor: '#E8F8E8',

    /** Border color of edge labels */
    EdgeLabelBorderColor: '#C1F0C5',

    /** Text color of edge labels */
    EdgeLabelColor: '#6F6F6F',

    /** Horizontal padding inside edge labels */
    EdgeLabelHorizontalPadding: 8,

    /** Vertical padding inside edge labels */
    EdgeLabelVerticalPadding: 4,

    /** Color used to highlight edges during preview (e.g., when dragging a new connection) */
    EdgePreviewColor: '#275EE7',

    /** Width of edges in the diagram */
    EdgeWidth: 2,

    /** Font family used throughout the diagram */
    FontFamily: 'Inter, Arial, sans-serif',

    /** Default font size for text in the diagram */
    FontSize: 14,

    /** Border radius of nodes in the diagram */
    NodeBorderRadius: 10,

    /** Default height of nodes in the diagram */
    NodeHeight: 75,

    /** Spacing between content of nodes in the diagram */
    NodeSpacing: 18,

    /** Default size of node icons in the diagram */
    NodeIconSize: 25,

    /** Spacing between node labels */
    NodeLabelSpacing: 4,

    /** Default width of nodes in the diagram */
    NodeWidth: 260,

    /** Size of the menu tool */
    NodeToolSize: 24,

    /** Spacing between the menu tool and the node */
    NodeToolSpacing: 11,

    /** Background color of notes in the diagram */
    NoteBackgroundColor: '#E8EDF8',

    /** Border color of notes in the diagram */
    NoteBorderColor: '#B6C6F2',

    /** Default height of notes in the diagram */
    NoteHeight: 80,

    /** Padding inside notes in the diagram */
    NotePadding: 16,

    /** Color of the note text in the diagram */
    NoteTextColor: '#3C414E',

    /** Default width of notes in the diagram */
    NoteWidth: 200,

    /** Border color of placeholders in the diagram */
    PlaceholderBorderColor: '#DCDFE5',

    /** Border width of placeholders in the diagram */
    PlaceholderBorderWidth: 1,

    /** Border pattern of placeholders in the diagram */
    PlaceholderBorderPattern: '6, 6',

    /** Background color of triggers in the diagram */
    TriggerBackgroundColor: '#FFFFFF',

    /** Border color of triggers in the diagram */
    TriggerBorderColor: '#DCDFE5',

    /** Border width of triggers in the diagram */
    TriggerBorderWidth: 1,

    /** Height of the Trigger node */
    TriggerHeight: 68,
};

export default Theme;

/** Attributes for the main label on nodes */
export const nodeLabelAttributes = {
    fill: '#333333',
    fontSize: Theme.FontSize,
    fontWeight: 600,
    fontFamily: Theme.FontFamily,
    textVerticalAnchor: 'top',
    textAnchor: 'start',
};

/** Attributes for the icon background inside a node */
export const typeLabelAttributes = {
    fill: '#A4AAB2',
    fontSize: Theme.FontSize - 2,
    fontWeight: 700,
    fontFamily: Theme.FontFamily,
    textVerticalAnchor: 'bottom',
    textAnchor: 'start',
    style: { textTransform: 'uppercase' },
};

/** Attributes for the labels on edges */
export const edgeLabelAttributes = {
    fontFamily: Theme.FontFamily,
    fontSize: Theme.FontSize,
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
    strokeWidth: 2,
    strokeLinecap: 'round',
};
