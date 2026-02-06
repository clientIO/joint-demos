/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/
import '@joint/plus/joint-plus.css';
import '../css/index.css';
import * as joint from '@joint/plus';
import { VisioArchive } from '@joint/format-visio';

document.body.classList.add('loading');

VisioArchive.fromURL('/network.vsdx').then(function(archive) {
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
