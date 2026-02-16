import * as joint from '@joint/plus';
import { VisioArchive } from '@joint/format-visio';
import '../css/index.css';

// Import vsdx file as URL using Vite's asset import feature
// It is specifically needed to preserve paths for the GitHub Pages deployment
import networkExample from '../assets/network.vsdx?url';

document.body.classList.add('loading');

VisioArchive.fromURL(networkExample).then(function(archive) {
    const page = archive.document.getPages()[0];

    const graph = new joint.dia.Graph();

    const paper = new joint.dia.Paper({
        el: document.getElementById('paper'),
        model: graph,
        interactive: false,
        width: page.width,
        height: page.height,
        sorting: joint.dia.Paper.sorting.APPROX,
        async: true,
        frozen: true
    });

    page.getContent().then(function(content) {
        const cells = content.toGraphCells();
        graph.resetCells(cells);
        paper.unfreeze();
        document.body.classList.remove('loading');
    });
});
