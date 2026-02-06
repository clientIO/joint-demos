import Controller from '../controller';
import { type dia, ui, format } from '@joint/plus';
import { toBPMN } from '@joint/format-bpmn-export';
import { bpmnExportOptions } from '../shapes/factories';
import { toolbarToolNames, openFileDropdownToolNames, openFileDropdownTools } from '../configs/toolbar-config';
import { fontsStyleSheet } from '../configs/font-style-sheet';
import { XMLFileImporter, JSONFileImporter } from '../import';

type ToolbarActionsControllerArgs = {
    paper: dia.Paper;
    paperScroller: ui.PaperScroller;
    toolbar: ui.Toolbar;
    commandManager: dia.CommandManager
}

export default class ToolbarActionsController extends Controller<ToolbarActionsControllerArgs> {

    isFileDropdownOpen = false;

    startListening() {
        const { toolbar } = this.context;

        this.listenTo(toolbar, {
            [`${toolbarToolNames.OPEN_FILE_DROPDOWN}:pointerclick`]: (context: ToolbarActionsControllerArgs) => {

                // Close the file dropdown if it is already open
                if (this.isFileDropdownOpen) {
                    ui.ContextToolbar.close();
                    return;
                }

                this.isFileDropdownOpen = true;

                const contextToolbar = onOpenFileDropdownClick(context);
                contextToolbar?.once('close', () => this.isFileDropdownOpen = false);
            },
            [`${toolbarToolNames.PRINT}:pointerclick`]: onPrintClick,
            [`${toolbarToolNames.SAVE_PNG}:pointerclick`]: onSavePNGClick,
            [`${toolbarToolNames.SAVE_JSON}:pointerclick`]: onSaveJSONClick,
            [`${toolbarToolNames.SAVE_XML}:pointerclick`]: onSaveXMLClick,
        });
    }
}

function onOpenFileDropdownClick(context: ToolbarActionsControllerArgs) {
    const { toolbar } = context;

    const contextToolbar = new ui.ContextToolbar({
        target: toolbar.getWidgetByName(toolbarToolNames.OPEN_FILE_DROPDOWN).el,
        root: toolbar.el,
        className: 'context-toolbar file-dropdown',
        padding: 4,
        vertical: true,
        position: 'bottom-left',
        anchor: 'top-left',
        tools: openFileDropdownTools
    });

    contextToolbar.on(`action:${openFileDropdownToolNames.LOAD_JSON}`, loadFromJSON(context));
    contextToolbar.on(`action:${openFileDropdownToolNames.LOAD_XML}`, loadFromXML(context));

    contextToolbar.render();

    return contextToolbar;
}

function onPrintClick(context: ToolbarActionsControllerArgs) {
    const { paper } = context;

    format.print(paper, { grid: true });
}

async function onSavePNGClick(context: ToolbarActionsControllerArgs) {
    const { paper } = context;

    paper.hideTools();
    format.toPNG(paper, (dataURL: string) => {
        new ui.Lightbox({
            image: dataURL,
            downloadable: true,
            fileName: 'joint-plus',
            title: 'Download PNG',
            top: 0
        }).open();
        paper.showTools();
    }, {
        padding: 10,
        useComputedStyles: false,
        grid: true,
        stylesheet: await fontsStyleSheet()
    });
}

function onSaveJSONClick(context: ToolbarActionsControllerArgs) {
    const { paper } = context;

    const str = JSON.stringify(paper.model.toJSON());
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], { type: 'application/json' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = 'jj-plus-bpmn-diagram.json';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

function onSaveXMLClick(context: ToolbarActionsControllerArgs) {
    const { paper } = context;

    const { xml } = toBPMN(paper, bpmnExportOptions);
    const xmlString = new XMLSerializer().serializeToString(xml);

    const blob = new Blob([xmlString], { type: 'application/xml' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = 'jj-plus-bpmn-diagram.bpmn';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

// helper functions

function loadFromJSON(context: ToolbarActionsControllerArgs) {
    const { paper, paperScroller } = context;
    const jsonFileImporter = new JSONFileImporter(paperScroller);

    return () => {

        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', '.json');

        input.click();

        input.onchange = async() => {

            const file = input.files?.[0];

            if (!file) return;

            await jsonFileImporter.import(file, paper.model);
            ui.ContextToolbar.close();
        };
    };
}

function loadFromXML(context: ToolbarActionsControllerArgs) {
    const { paper, paperScroller, commandManager } = context;
    const xmlFileImporter = new XMLFileImporter(paperScroller, commandManager);

    return () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.bpmn, .xml';

        input.click();

        input.onchange = async() => {

            const file = input.files?.[0];

            if (!file) return;

            await xmlFileImporter.import(file, paper.model);
            ui.ContextToolbar.close();
        };
    };
}
