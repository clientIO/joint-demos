import { util } from '@joint/core';
import { VisioArchive, VisioShape, types, util as visioUtil } from '@joint/format-visio';
import templateUrl from '../assets/ranks.vsdx?url';

import type { dia } from '@joint/core';
import type { VisioPage } from '@joint/format-visio';

const { VisioCellName, VisioSectionType, VisioUnitType } = types;

type ShapeKind = 'element' | 'header' | 'link';

interface ShapeMapping {
    // The name of the master in the template (the shapes of the Ranks stencil).
    master: string;
    // Sets the cells of the Visio shape created from the master.
    update: (shape: VisioShape, cellView: dia.CellView) => void;
}

// Visio arrowhead 4: a filled triangle twice as long as it is wide, as the target marker of the links.
const VISIO_FILLED_ARROW = '4';
// Visio line pattern 2: a dashed line.
const VISIO_LINE_DASHED = '2';
// Visio connector routing: right-angle style with curved lines (what `fromPaper()` sets for the `curve` connector).
const VISIO_ROUTE_STYLE_RIGHT_ANGLE = '1';
const VISIO_LINE_ROUTE_CURVED = '2';

// JointJS shape -> Visio shape.
const mappings: Record<ShapeKind, ShapeMapping> = {
    element: {
        master: 'Element',
        update: (shape, cellView) => updateElementShape(shape, cellView as dia.ElementView)
    },
    header: {
        master: 'Rectangle',
        update: (shape, cellView) => updateHeaderShape(shape, cellView as dia.ElementView)
    },
    link: {
        master: 'Dynamic connector',
        update: (shape, cellView) => updateLinkShape(shape, cellView as dia.LinkView)
    }
};

function getShapeKind(cell: dia.Cell): ShapeKind {
    if (cell.isLink()) {
        return 'link';
    }
    return cell.get('header') ? 'header' : 'element';
}

function toInches(pixels: number): number {
    return visioUtil.fromPixels(pixels, VisioUnitType.IN);
}

// `#rgb` and `#rrggbb` only; `null` for any other color (the master's color is kept).
function toVisioColor(color: unknown): string | null {
    if (typeof color !== 'string') {
        return null;
    }
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
    if (short) {
        const [, r, g, b] = short;
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}

function setGeometry(shape: VisioShape, elementView: dia.ElementView) {
    const { model: element, paper } = elementView;
    const { width, height } = element.size();
    const center = element.getBBox().center();
    // Visio measures from the bottom of the page, which `fromPaper()` makes as tall as the paper area.
    const pageHeight = paper!.getArea().height;
    shape.setCell(VisioCellName.PinX, { value: toInches(center.x), units: VisioUnitType.IN });
    shape.setCell(VisioCellName.PinY, { value: toInches(pageHeight - center.y), units: VisioUnitType.IN });
    shape.setCell(VisioCellName.Width, { value: toInches(width), units: VisioUnitType.IN });
    shape.setCell(VisioCellName.Height, { value: toInches(height), units: VisioUnitType.IN });
}

function updateElementShape(shape: VisioShape, elementView: dia.ElementView) {
    const { model: element } = elementView;
    setGeometry(shape, elementView);
    shape.setText(element.attr('label/text'));
    const fillColor = toVisioColor(element.attr('body/fill'));
    if (fillColor) {
        shape.setCell(VisioCellName.FillForegnd, { value: fillColor });
    }
    const textColor = toVisioColor(element.attr('label/fill'));
    const characterRow = shape.getSection(VisioSectionType.Character)?.getRow(0);
    if (textColor && characterRow) {
        characterRow.setCell(VisioCellName.Color, { value: textColor });
    }
}

// The rank header has neither fill nor outline; its text keeps the style of the master.
function updateHeaderShape(shape: VisioShape, elementView: dia.ElementView) {
    setGeometry(shape, elementView);
    shape.setText(elementView.model.attr('label/text'));
    shape.setCell(VisioCellName.FillPattern, { value: '0' });
    shape.setCell(VisioCellName.LinePattern, { value: '0' });
}

// The ends of the connector and their glue to the elements are set by `fromPaper()`.
function updateLinkShape(shape: VisioShape, linkView: dia.LinkView) {
    const { model: link } = linkView;
    const lineColor = toVisioColor(link.attr('line/stroke'));
    if (lineColor) {
        shape.setCell(VisioCellName.LineColor, { value: lineColor });
    }
    const dasharray = link.attr('line/strokeDasharray');
    if (dasharray && dasharray !== 'none') {
        shape.setCell(VisioCellName.LinePattern, { value: VISIO_LINE_DASHED });
    }
    if (link.attr('line/targetMarker')) {
        shape.setCell(VisioCellName.EndArrow, { value: VISIO_FILLED_ARROW });
    }
    shape.setCell(VisioCellName.ShapeRouteStyle, { value: VISIO_ROUTE_STYLE_RIGHT_ANGLE });
    shape.setCell(VisioCellName.ConLineRouteExt, { value: VISIO_LINE_ROUTE_CURVED });
}

// Exports the diagram on the paper into the template, the shapes made from the masters of the Ranks stencil.
export async function exportToVisio(paper: dia.Paper, fileName = 'ranked-layout.vsdx') {
    const archive = await VisioArchive.fromURL(templateUrl);
    const { document: visioDocument } = archive;
    const masters = visioDocument.getMastersNameMap();
    const [page] = visioDocument.getPages();

    const exportCell = async(cellView: dia.CellView, visioPage: VisioPage): Promise<VisioShape | null> => {
        const mapping = mappings[getShapeKind(cellView.model)];
        const master = masters[mapping.master];
        if (!master) {
            console.warn(`Visio export: the template has no master "${mapping.master}".`);
            return null;
        }
        const shape = await VisioShape.fromMaster(master, visioPage);
        mapping.update(shape, cellView);
        return shape;
    };

    await page.fromPaper(paper, {
        exportElement: exportCell,
        exportLink: exportCell
    });

    const blob = await archive.toVSDX();
    util.downloadBlob(blob, fileName);
}
