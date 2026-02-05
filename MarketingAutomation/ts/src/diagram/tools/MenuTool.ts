import { elementTools, util } from '@joint/plus';
import Theme from '../theme';

/** SVG markup for the menu tool button */
const menuButtonMarkup = util.svg/* xml */`
    <rect
        class="menu-button-body"
        width="${Theme.NodeToolSize}"
        height="${Theme.NodeToolSize}"
        fill="transparent"
        stroke="none"
        rx="8"
        ry="8"
    />
    <image
        class="menu-button-icon"
        x="${Theme.NodeToolPadding}"
        y="${Theme.NodeToolPadding}"
        width="${Theme.NodeToolSize - Theme.NodeToolPadding * 2}"
        height="${Theme.NodeToolSize - Theme.NodeToolPadding * 2}"
        href="assets/icons/menu.svg#icon"
    />
`;

export default class MenuTool extends elementTools.Button {

    preinitialize() {
        this.options.useModelGeometry = true;
        this.attributes = {
            cursor: 'pointer'
        };
        this.children = menuButtonMarkup;
    }

    initialize() {
        super.initialize();
        this.el.classList.add('fade-in');
    }
}
