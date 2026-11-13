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
        master: 'Header',
        update: (shape, cellView) => updateHeaderShape(shape, cellView as dia.ElementView)
    },
    link: {
        master: 'Connector',
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

const VISIO_NAMESPACE = 'http://schemas.microsoft.com/office/visio/2012/main';
// The connection points of the "Element" master: 2 is the middle of the right side, 4 of the left side.
const ELEMENT_RIGHT_CONNECTION = 2;
const ELEMENT_LEFT_CONNECTION = 4;
// The glue formula `fromPaper()` writes for an anchor on a given side: the sheet and the connection row it adds.
const GLUE_FORMULA = /^PAR\(PNT\(Sheet\.(\d+)!Connections\.(\w+)\.X,/;
// The ends of a connector, with their Visio part (visBegin, visEnd).
const LINK_ENDS = [{ name: 'Begin', part: 9 }, { name: 'End', part: 12 }];

// The archive keeps its files in a JSZip instance.
interface ArchiveZip {
    file(path: string): { async(type: 'string'): Promise<string> } | null;
    file(path: string, content: string): void;
}

// TODO: a workaround. `fromPaper()` writes no <Connect> elements, so Visio does not take the links as glued
// to the elements. It relies on library internals: `archive.zip` and `page.fileName`.
// Each link end is glued to the connection point of the master on the side of its anchor (instead of the row
// `fromPaper()` adds for the anchor), and a <Connect> element records the glue.
async function glueLinks(archive: VisioArchive, page: VisioPage) {
    const { zip } = archive as unknown as { zip: ArchiveZip };
    const path = `visio/pages/${(page as unknown as { fileName: string }).fileName}.xml`;
    const xml = await zip.file(path)!.async('string');
    const pageContents = new DOMParser().parseFromString(xml, 'application/xml');
    const shapes = new Map<string, Element>();
    pageContents.querySelectorAll('Shapes > Shape').forEach((shape) => shapes.set(shape.getAttribute('ID')!, shape));
    let connects = pageContents.querySelector('Connects');
    if (!connects) {
        connects = pageContents.createElementNS(VISIO_NAMESPACE, 'Connects');
        pageContents.documentElement.appendChild(connects);
    }
    shapes.forEach((linkShape, linkId) => {
        LINK_ENDS.forEach(({ name, part }) => {
            const xCell = linkShape.querySelector(`:scope > Cell[N="${name}X"]`);
            const yCell = linkShape.querySelector(`:scope > Cell[N="${name}Y"]`);
            const match = GLUE_FORMULA.exec(xCell?.getAttribute('F') ?? '');
            if (!xCell || !yCell || !match) {
                return;
            }
            const [, sheetId, rowName] = match;
            const row = shapes.get(sheetId)?.querySelector(`:scope > Section[N="Connection"] > Row[N="${rowName}"]`);
            if (!row) {
                return;
            }
            // The row of an anchor on the right side has `X = Width`.
            const isRight = row.querySelector(':scope > Cell[N="X"]')?.getAttribute('F') === 'Width';
            const index = isRight ? ELEMENT_RIGHT_CONNECTION : ELEMENT_LEFT_CONNECTION;
            row.remove();
            const ref = `Sheet.${sheetId}!Connections`;
            const formula = `PAR(PNT(${ref}.X${index},${ref}.Y${index}))`;
            xCell.setAttribute('F', formula);
            yCell.setAttribute('F', formula);
            const connect = pageContents.createElementNS(VISIO_NAMESPACE, 'Connect');
            connect.setAttribute('FromSheet', linkId);
            connect.setAttribute('FromCell', `${name}X`);
            connect.setAttribute('FromPart', String(part));
            connect.setAttribute('ToSheet', sheetId);
            connect.setAttribute('ToCell', `Connections.X${index}`);
            // The part of a connection point: 100 + its row index (`X2` is the row 1).
            connect.setAttribute('ToPart', String(100 + index - 1));
            connects.appendChild(connect);
        });
    });
    zip.file(path, new XMLSerializer().serializeToString(pageContents));
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
    await glueLinks(archive, page);

    const blob = await archive.toVSDX();
    util.downloadBlob(blob, fileName);
}
