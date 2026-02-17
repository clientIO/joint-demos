import { dia } from '@joint/plus';

interface HyperlinkHighlighterOptions extends dia.HighlighterView.Options {
    path: string;
}

export class HyperlinkHighlighter extends dia.HighlighterView<HyperlinkHighlighterOptions> {

    preinitialize() {
        this.MOUNTABLE = false;
    }

    highlight(elementView: dia.ElementView, node: SVGElement) {
        const { path } = this.options;
        const hyperlink = elementView.model.prop(path);
        if (!hyperlink) return;
        node.style.textDecoration = 'underline';
        node.style.fill = '#0099ff';
        node.style.cursor = 'pointer';
        node.setAttribute('event', 'element:link');
        node.dataset.tooltip = 'Click to open the sub-process.';
        node.dataset.hyperlink = hyperlink;
    }

    static addToLabel(element: dia.Element, paper: dia.Paper, path: string) {
        return this.add(
            element.findView(paper),
            // The element selector pointing to the SVGText sub-element
            'label',
            // The unique ID of the highlighter
            'hyperlink-highlighter',
            // Options
            { path }
        );
    }
}
