import { dia, ui, shapes, g } from '@joint/plus';
import './styles.scss';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' }
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 100,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#FCFCFC'
            }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 100,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

stencil.load([
    {
        type: 'standard.BorderedImage',
        size: { width: 80, height: 80 },
        attrs: {
            image: { href: 'https://picsum.photos/id/56/800/800' }
        }
    },
    {
        type: 'standard.BorderedImage',
        size: { width: 80, height: 60 },
        attrs: {
            image: { href: 'https://picsum.photos/id/314/800/600' }
        }
    }
]);

document
    .getElementById('add-image-input')
    .addEventListener('change', async() => {
        const files = Array.from(event.target.files);
        const promises = files.map((file) => readImageFile(file));
        const result = await Promise.all(promises);
        const images = result.filter((image) => image !== null);
        const stencilGraph = stencil.getGraph();
        stencilGraph.addCells(images);
        stencil.layoutGroup(stencilGraph);
        stencil.fitPaperToContent(stencil.getPaper());
    });

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener(
            'load',
            () => {
                const img = new Image();
                img.onload = () => {
                    const { naturalWidth, naturalHeight } = img;
                    const maxImageBBox = new g.Rect(0, 0, 80, 80);
                    const scale = maxImageBBox.maxRectUniformScaleToFit(
                        new g.Rect(0, 0, naturalWidth, naturalHeight),
                        new g.Point(0, 0)
                    );
                    const el = createImage(
                        reader.result,
                        naturalWidth * scale,
                        naturalHeight * scale
                    );
                    resolve(el);
                };
                img.onerror = function() {
                    resolve(null);
                };
                img.src = reader.result;
            },
            false
        );
        reader.readAsDataURL(file);
    });
}

function createImage(href, width, height) {
    return new shapes.standard.BorderedImage({
        size: { width, height },
        attrs: {
            image: {
                href,
                preserveAspectRatio: 'none'
            }
        }
    });
}

paper.on('element:pointerclick', (elementView) => {
    const lightbox = new ui.Lightbox({
        image: elementView.model.attr('image/href'),
        downloadable: true
    });
    lightbox.open();
});
