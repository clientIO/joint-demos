var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Controller from '../controller';
import { ui, format } from '@joint/plus';
import { toBPMN } from '@joint/format-bpmn-export';
import { bpmnExportOptions } from '../shapes/factories';
import { toolbarToolNames, openFileDropdownToolNames, openFileDropdownTools } from '../configs/toolbar-config';
import { XMLFileImporter } from '../import';
import * as monaco from 'monaco-editor';

export default class ToolbarActionsController extends Controller {
    constructor() {
        super(...arguments);

        this.isFileDropdownOpen = false;
        this.isLoadProcessDropdownOpen = false;
        this.isStartProcessDropdownOpen = false;
        this.deployedProcesses = [];
    }

    startListening() {
        const { toolbar } = this.context;

        this.listenTo(toolbar, {
            [`${toolbarToolNames.OPEN_FILE_DROPDOWN}:pointerclick`]: (context) => {

                // Close the file dropdown if it is already open
                if (this.isFileDropdownOpen) {
                    ui.ContextToolbar.close();
                    return;
                }

                this.isFileDropdownOpen = true;

                const contextToolbar = onOpenFileDropdownClick(context);
                contextToolbar === null || contextToolbar === void 0 ? void 0 : contextToolbar.once('close', () => this.isFileDropdownOpen = false);
            },
            [`${toolbarToolNames.PRINT}:pointerclick`]: onPrintClick,
            [`${toolbarToolNames.CLEAR_DIAGRAM}:pointerclick`]: onClearDiagramClick,
            [`${toolbarToolNames.DEPLOY_PROCESS}:pointerclick`]: (context) => onDeployProcessClick(context, this),
            [`${toolbarToolNames.LOAD_PROCESS_DROPDOWN}:pointerclick`]: (context) => __awaiter(this, void 0, void 0, function* () {

                // Close the dropdown if it is already open
                if (this.isLoadProcessDropdownOpen) {
                    ui.ContextToolbar.close();
                    return;
                }

                this.isLoadProcessDropdownOpen = true;

                // Always fetch fresh process list from Camunda
                yield loadDeployedProcesses(this);

                const contextToolbar = onLoadProcessDropdownClick(context, this);
                contextToolbar === null || contextToolbar === void 0 ? void 0 : contextToolbar.once('close', () => this.isLoadProcessDropdownOpen = false);
            }),
            [`${toolbarToolNames.START_PROCESS_DROPDOWN}:pointerclick`]: (context) => __awaiter(this, void 0, void 0, function* () {

                // Close the dropdown if it is already open
                if (this.isStartProcessDropdownOpen) {
                    ui.ContextToolbar.close();
                    return;
                }

                this.isStartProcessDropdownOpen = true;

                // Always fetch fresh process list from Camunda
                yield loadDeployedProcesses(this);

                const contextToolbar = onStartProcessDropdownClick(context, this);
                contextToolbar === null || contextToolbar === void 0 ? void 0 : contextToolbar.once('close', () => this.isStartProcessDropdownOpen = false);
            }),
            [`${toolbarToolNames.VIEW_XML}:pointerclick`]: onViewXMLClick,
        });
    }
}

function onOpenFileDropdownClick(context) {
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
    
    contextToolbar.on(`action:${openFileDropdownToolNames.LOAD_XML}`, loadFromXML(context));
    contextToolbar.on(`action:${openFileDropdownToolNames.DOWNLOAD_XML}`, () => onDownloadXMLClick(context));
    
    contextToolbar.render();
    
    return contextToolbar;
}

function onPrintClick(context) {
    const { paper } = context;

    format.print(paper, { grid: true });
}

function onClearDiagramClick(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const { paper } = context;
        const confirmed = yield showConfirmation(
            'Clear Diagram',
            'Are you sure you want to clear the diagram? This cannot be undone.'
        );
        if (confirmed) {
            paper.model.clear();
        }
    });
}

function getProcessNameFromToolbar(toolbar) {
    const processNameWidget = toolbar.getWidgetByName(toolbarToolNames.PROCESS_NAME);
    if (processNameWidget && processNameWidget.el) {
        const inputEl = processNameWidget.el.querySelector('input');
        if (inputEl && inputEl.value) {
            return inputEl.value;
        }
    }
    return null;
}

// ---- Notification / confirmation dialog helper ----

/**
 * Show a styled notification dialog (replaces native alert).
 * @param {'success'|'error'|'info'|'warning'} variant
 * @param {string} title
 * @param {string} message    — may contain HTML
 * @param {object} [opts]
 * @param {boolean} [opts.modal=true]
 * @param {number}  [opts.autoClose=0]  — ms, 0 = no auto-close
 */
function showNotification(variant, title, message, opts = {}) {
    const { modal = true, autoClose = 0 } = opts;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    const content = document.createElement('div');
    content.className = 'notification-dialog-body';
    content.innerHTML = `
        <div class="notification-dialog-icon notification-dialog-icon--${variant}">
            <span>${icons[variant] || icons.info}</span>
        </div>
        <div class="notification-dialog-message">${message}</div>
    `;

    const dialog = new ui.Dialog({
        width: 420,
        title: title,
        content: content,
        closeButton: true,
        modal: modal,
        className: `notification-dialog notification-dialog--${variant}`,
        theme: 'bpmn',
        buttons: [
            {
                content: 'OK',
                position: 'center',
                action: 'ok'
            }
        ]
    });

    dialog.on('action:ok', () => dialog.close());

    dialog.render();
    dialog.$el.addClass('joint-dialog joint-theme-modern');
    dialog.open();

    if (autoClose > 0) {
        setTimeout(() => {
            try { dialog.close(); } catch (e) { /* already closed */ }
        }, autoClose);
    }

    return dialog;
}

/**
 * Show a styled confirmation dialog (replaces native confirm).
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 */
function showConfirmation(title, message) {
    return new Promise((resolve) => {
        const content = document.createElement('div');
        content.className = 'notification-dialog-body';
        content.innerHTML = `
            <div class="notification-dialog-icon notification-dialog-icon--warning">
                <span>⚠</span>
            </div>
            <div class="notification-dialog-message">${message}</div>
        `;

        const dialog = new ui.Dialog({
            width: 420,
            title: title,
            content: content,
            closeButton: true,
            modal: true,
            className: 'notification-dialog notification-dialog--warning',
            theme: 'bpmn',
            buttons: [
                {
                    content: 'Cancel',
                    position: 'left',
                    action: 'cancel'
                },
                {
                    content: 'Confirm',
                    position: 'right',
                    action: 'confirm'
                }
            ]
        });

        let resolved = false;
        dialog.on('action:confirm', () => { resolved = true; dialog.close(); resolve(true); });
        dialog.on('action:cancel',  () => { resolved = true; dialog.close(); resolve(false); });
        dialog.on('close', () => { if (!resolved) resolve(false); });

        dialog.render();
        dialog.$el.addClass('joint-dialog joint-theme-modern');
        dialog.open();
    });
}

function onDownloadXMLClick(context) {
    const { paper, toolbar } = context;

    // Get process name from toolbar
    const processName = getProcessNameFromToolbar(toolbar);

    // Process XML with Zeebe extensions (same as deploy)
    const processedXmlString = processXMLWithZeebeExtensions(paper, processName);

    // Use process name for filename if available
    const filename = processName ? `${processName}.bpmn` : 'jj-plus-bpmn-diagram.bpmn';

    const blob = new Blob([processedXmlString], { type: 'application/xml' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

// Format XML with proper indentation
function formatXML(xml) {
    const PADDING = '  ';
    const lines = [];
    let indent = 0;

    // Remove whitespace between tags, normalize to single string
    xml = xml.replace(/>\s+</g, '><').trim();

    // Use regex to split XML into parts: tags and text nodes
    const parts = [];
    let lastIndex = 0;
    const tagRegex = /<[^>]+>/g;
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
        // Text before this tag
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: xml.substring(lastIndex, match.index) });
        }
        parts.push({ type: 'tag', value: match[0] });
        lastIndex = tagRegex.lastIndex;
    }
    // Trailing text
    if (lastIndex < xml.length) {
        parts.push({ type: 'text', value: xml.substring(lastIndex) });
    }

    // Group: <open>text</close> into single inline elements
    const merged = [];
    for (let i = 0; i < parts.length; i++) {
        const curr = parts[i];
        // Check pattern: openTag + text + closeTag
        if (curr.type === 'tag' && !curr.value.startsWith('</') && !curr.value.endsWith('/>') && !curr.value.startsWith('<?')) {
            const next = parts[i + 1];
            const after = parts[i + 2];
            if (next && next.type === 'text' && after && after.type === 'tag' && after.value.startsWith('</')) {
                // Merge into inline element
                merged.push({ type: 'inline', value: curr.value + next.value + after.value });
                i += 2;
                continue;
            }
        }
        merged.push(curr);
    }

    // Now format with indentation
    for (const part of merged) {
        if (part.type === 'text') {
            // Standalone text node (shouldn't happen after merging, but just in case)
            const text = part.value.trim();
            if (text) {
                lines.push(PADDING.repeat(indent) + text);
            }
        } else if (part.type === 'inline') {
            // <tag>text</tag> on one line
            lines.push(PADDING.repeat(indent) + part.value);
        } else {
            // Tag
            const tag = part.value;
            if (tag.startsWith('</')) {
                // Closing tag
                indent = Math.max(0, indent - 1);
                lines.push(PADDING.repeat(indent) + tag);
            } else if (tag.startsWith('<?') || tag.endsWith('/>')) {
                // Processing instruction or self-closing
                lines.push(PADDING.repeat(indent) + tag);
            } else {
                // Opening tag
                lines.push(PADDING.repeat(indent) + tag);
                indent++;
            }
        }
    }

    return lines.join('\n');
}

// Store editor instance for cleanup
let xmlViewerEditor = null;
let xmlViewerDialog = null;

function onViewXMLClick(context) {
    const { paper, toolbar } = context;

    // Get process name from toolbar
    const processName = getProcessNameFromToolbar(toolbar);

    // Process XML with Zeebe extensions (same as deploy)
    const processedXmlString = processXMLWithZeebeExtensions(paper, processName);

    // Format XML for better readability
    const formattedXml = formatXML(processedXmlString);

    // Close existing dialog if open
    if (xmlViewerDialog) {
        xmlViewerDialog.close();
        xmlViewerDialog = null;
    }

    // Dispose existing editor if any
    if (xmlViewerEditor) {
        xmlViewerEditor.dispose();
        xmlViewerEditor = null;
    }

    // Create dialog content
    const content = document.createElement('div');
    content.className = 'xml-viewer-content';

    const editorContainer = document.createElement('div');
    editorContainer.className = 'xml-viewer-editor';
    editorContainer.style.width = '100%';
    editorContainer.style.height = '100%';
    editorContainer.style.flex = '1';
    content.appendChild(editorContainer);

    // Create the dialog (width as percentage string, height via CSS)
    xmlViewerDialog = new ui.Dialog({
        width: '80%',
        title: 'BPMN XML Source',
        content: content,
        closeButton: true,
        modal: true,
        draggable: true,
        className: 'xml-viewer-dialog',
        theme: 'bpmn'
    });

    xmlViewerDialog.on('close', () => {
        if (xmlViewerEditor) {
            xmlViewerEditor.dispose();
            xmlViewerEditor = null;
        }
        xmlViewerDialog = null;
    });

    // Render and open the dialog
    xmlViewerDialog.render();

    // Ensure the joint-dialog and theme classes are present
    xmlViewerDialog.$el.addClass('joint-dialog joint-theme-modern');

    xmlViewerDialog.open();

    // Create Monaco editor after dialog is rendered
    setTimeout(() => {
        xmlViewerEditor = monaco.editor.create(editorContainer, {
            value: formattedXml,
            language: 'xml',
            theme: 'vs-dark',
            readOnly: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 13,
            lineNumbers: 'on',
            wordWrap: 'on',
            folding: true
        });
    }, 100);
}

// Helper function to process XML with Zeebe extensions
function processXMLWithZeebeExtensions(paper, processName = null) {
    // Collect HTTP Connector elements, Service Task headers, and I/O mappings before export
    const httpConnectorConfigs = new Map();
    const serviceTaskHeaders = new Map();
    const elementInputMappings = new Map();
    const elementOutputMappings = new Map();
    const elements = paper.model.getElements();
    for (const element of elements) {
        const elementType = element.get('type');
        const bpmnId = 'id_' + element.id;

        // Collect input mappings for all elements
        const inputMappings = element.get('inputMappings');
        if (inputMappings && inputMappings.length > 0) {
            elementInputMappings.set(bpmnId, inputMappings);
            console.log('Collecting input mappings for:', bpmnId, inputMappings);
        }

        // Collect output mappings for all elements (activities, events, service tasks, etc.)
        const outputMappings = element.get('outputMappings');
        if (outputMappings && outputMappings.length > 0) {
            elementOutputMappings.set(bpmnId, outputMappings);
            console.log('Collecting output mappings for:', bpmnId, outputMappings);
        }

        if (elementType === 'activity.HttpConnector') {
            // JointJS element IDs start with underscore, toBPMN adds 'id_' prefix
            // So element.id="_abc" becomes "id__abc" in BPMN (two underscores total)
            httpConnectorConfigs.set(bpmnId, {
                httpConfig: element.get('httpConfig'),
                resultExpression: element.get('resultExpression') || '',
                errorExpression: element.get('errorExpression') || '',
                retries: element.get('retries') !== undefined ? element.get('retries') : 3,
                retryBackoff: element.get('retryBackoff') || 'PT0S'
            });
            console.log('Collecting HTTP config for:', bpmnId);
        } else if (elementType === 'activity.Service') {
            // Collect Zeebe headers for regular service tasks
            const resultExpression = element.get('resultExpression');
            const errorExpression = element.get('errorExpression');
            if (resultExpression || errorExpression) {
                serviceTaskHeaders.set(bpmnId, { resultExpression, errorExpression });
                console.log('Collecting Zeebe headers for:', bpmnId, { resultExpression, errorExpression });
            }
        }
    }

    const { xml } = toBPMN(paper, bpmnExportOptions);

    const bpmnNS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
    const bpmndiNS = 'http://www.omg.org/spec/BPMN/20100524/DI';
    const zeebeNS = 'http://camunda.org/schema/zeebe/1.0';

    // Add Zeebe namespace to definitions element
    const definitions = xml.getElementsByTagNameNS(bpmnNS, 'definitions')[0];
    if (definitions) {
        definitions.setAttribute('xmlns:zeebe', zeebeNS);
    }

    // Set isExecutable="true" on process elements for Camunda deployment
    // Also set process id and name if provided
    const processElements = xml.getElementsByTagNameNS(bpmnNS, 'process');
    for (let i = 0; i < processElements.length; i++) {
        processElements[i].setAttribute('isExecutable', 'true');
        if (processName) {
            // Convert process name to valid BPMN ID (replace spaces with underscores, remove special chars)
            const processId = processName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            processElements[i].setAttribute('id', processId);
            processElements[i].setAttribute('name', processName);
        }
    }

    // Add zeebe:taskDefinition to all service tasks (required by Camunda 8)
    const serviceTasks = xml.getElementsByTagNameNS(bpmnNS, 'serviceTask');
    for (let i = 0; i < serviceTasks.length; i++) {
            const serviceTask = serviceTasks[i];
            const taskId = serviceTask.getAttribute('id');
            const httpConnectorData = httpConnectorConfigs.get(taskId);

            let extensionElements = serviceTask.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
            if (!extensionElements) {
                extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
                serviceTask.insertBefore(extensionElements, serviceTask.firstChild);
            }

            if (httpConnectorData) {
                const httpConfig = httpConnectorData.httpConfig;
                // This is an HTTP Connector task
                serviceTask.setAttribute('zeebe:modelerTemplate', 'io.camunda.connectors.HttpJson.v2');
                serviceTask.setAttribute('zeebe:modelerTemplateVersion', '12');

                // Add task definition
                const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
                taskDefinition.setAttribute('type', 'io.camunda:http-json:1');
                taskDefinition.setAttribute('retries', String(httpConnectorData.retries));
                extensionElements.appendChild(taskDefinition);

                // Add IO mapping
                const ioMapping = xml.createElementNS(zeebeNS, 'zeebe:ioMapping');

                // Authentication type
                const authInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                authInput.setAttribute('source', '="noAuth"');
                authInput.setAttribute('target', 'authentication.type');
                ioMapping.appendChild(authInput);

                // Method
                const methodInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                const methodValue = httpConfig.method || 'GET';
                methodInput.setAttribute('source', `="${methodValue}"`);
                methodInput.setAttribute('target', 'method');
                ioMapping.appendChild(methodInput);

                // URL
                const urlInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                const urlValue = httpConfig.url || '';
                urlInput.setAttribute('source', `="${urlValue}"`);
                urlInput.setAttribute('target', 'url');
                ioMapping.appendChild(urlInput);

                // Headers (if provided)
                if (httpConfig.headers) {
                    const headersInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                    headersInput.setAttribute('source', `=${httpConfig.headers}`);
                    headersInput.setAttribute('target', 'headers');
                    ioMapping.appendChild(headersInput);
                }

                // Query params (if provided)
                if (httpConfig.queryParams) {
                    const queryInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                    queryInput.setAttribute('source', `=${httpConfig.queryParams}`);
                    queryInput.setAttribute('target', 'queryParameters');
                    ioMapping.appendChild(queryInput);
                }

                // Body (if provided)
                if (httpConfig.body) {
                    const bodyInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                    bodyInput.setAttribute('source', `=${httpConfig.body}`);
                    bodyInput.setAttribute('target', 'body');
                    ioMapping.appendChild(bodyInput);
                }

                // Store response
                const storeResponseInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                storeResponseInput.setAttribute('source', '=false');
                storeResponseInput.setAttribute('target', 'storeResponse');
                ioMapping.appendChild(storeResponseInput);

                // Timeouts (configurable, default 20 seconds; 0 = no timeout)
                const connTimeout = httpConfig.connectionTimeoutInSeconds !== undefined ? httpConfig.connectionTimeoutInSeconds : 20;
                const connTimeoutInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                connTimeoutInput.setAttribute('source', `=${connTimeout}`);
                connTimeoutInput.setAttribute('target', 'connectionTimeoutInSeconds');
                ioMapping.appendChild(connTimeoutInput);

                const readTimeout = httpConfig.readTimeoutInSeconds !== undefined ? httpConfig.readTimeoutInSeconds : 20;
                const readTimeoutInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                readTimeoutInput.setAttribute('source', `=${readTimeout}`);
                readTimeoutInput.setAttribute('target', 'readTimeoutInSeconds');
                ioMapping.appendChild(readTimeoutInput);

                const writeTimeout = httpConfig.writeTimeoutInSeconds !== undefined ? httpConfig.writeTimeoutInSeconds : 0;
                const writeTimeoutInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                writeTimeoutInput.setAttribute('source', `=${writeTimeout}`);
                writeTimeoutInput.setAttribute('target', 'writeTimeoutInSeconds');
                ioMapping.appendChild(writeTimeoutInput);

                // Ignore null values
                const ignoreNullInput = xml.createElementNS(zeebeNS, 'zeebe:input');
                ignoreNullInput.setAttribute('source', '=false');
                ignoreNullInput.setAttribute('target', 'ignoreNullValues');
                ioMapping.appendChild(ignoreNullInput);

                // Add user-defined input mappings if present
                const inputMappings = elementInputMappings.get(taskId);
                if (inputMappings && inputMappings.length > 0) {
                    for (const mapping of inputMappings) {
                        if (mapping.target && mapping.source) {
                            const inputElement = xml.createElementNS(zeebeNS, 'zeebe:input');
                            let sourceExpr = mapping.source.trim();
                            if (!sourceExpr.startsWith('=')) {
                                sourceExpr = '=' + sourceExpr;
                            }
                            inputElement.setAttribute('source', sourceExpr);
                            inputElement.setAttribute('target', mapping.target);
                            ioMapping.appendChild(inputElement);
                        }
                    }
                }

                // Add output mappings if present
                const outputMappings = elementOutputMappings.get(taskId);
                if (outputMappings && outputMappings.length > 0) {
                    for (const mapping of outputMappings) {
                        if (mapping.target && mapping.source) {
                            const outputElement = xml.createElementNS(zeebeNS, 'zeebe:output');
                            // Source is FEEL expression, ensure it starts with '='
                            let sourceExpr = mapping.source.trim();
                            if (!sourceExpr.startsWith('=')) {
                                sourceExpr = '=' + sourceExpr;
                            }
                            outputElement.setAttribute('source', sourceExpr);
                            outputElement.setAttribute('target', mapping.target);
                            ioMapping.appendChild(outputElement);
                        }
                    }
                }

                extensionElements.appendChild(ioMapping);

                // Add task headers
                const taskHeaders = xml.createElementNS(zeebeNS, 'zeebe:taskHeaders');

                const templateVersionHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                templateVersionHeader.setAttribute('key', 'elementTemplateVersion');
                templateVersionHeader.setAttribute('value', '12');
                taskHeaders.appendChild(templateVersionHeader);

                const templateIdHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                templateIdHeader.setAttribute('key', 'elementTemplateId');
                templateIdHeader.setAttribute('value', 'io.camunda.connectors.HttpJson.v2');
                taskHeaders.appendChild(templateIdHeader);

                const resultVarHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                resultVarHeader.setAttribute('key', 'resultVariable');
                resultVarHeader.setAttribute('value', httpConfig.resultVariable || '');
                taskHeaders.appendChild(resultVarHeader);

                const resultExprHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                resultExprHeader.setAttribute('key', 'resultExpression');
                resultExprHeader.setAttribute('value', httpConnectorData.resultExpression || '');
                taskHeaders.appendChild(resultExprHeader);

                const errorExprHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                errorExprHeader.setAttribute('key', 'errorExpression');
                errorExprHeader.setAttribute('value', httpConnectorData.errorExpression || '');
                taskHeaders.appendChild(errorExprHeader);

                const retryBackoffHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                retryBackoffHeader.setAttribute('key', 'retryBackoff');
                retryBackoffHeader.setAttribute('value', httpConnectorData.retryBackoff);
                taskHeaders.appendChild(retryBackoffHeader);

                extensionElements.appendChild(taskHeaders);
            } else {
                // Regular service task
                const taskName = serviceTask.getAttribute('name') || 'default';
                const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
                taskDefinition.setAttribute('type', taskName);
                extensionElements.appendChild(taskDefinition);

                // Add Zeebe task headers if result/error expressions are set
                const headers = serviceTaskHeaders.get(taskId);
                if (headers && (headers.resultExpression || headers.errorExpression)) {
                    const taskHeaders = xml.createElementNS(zeebeNS, 'zeebe:taskHeaders');

                    if (headers.resultExpression) {
                        const resultExprHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                        resultExprHeader.setAttribute('key', 'resultExpression');
                        resultExprHeader.setAttribute('value', headers.resultExpression);
                        taskHeaders.appendChild(resultExprHeader);
                    }

                    if (headers.errorExpression) {
                        const errorExprHeader = xml.createElementNS(zeebeNS, 'zeebe:header');
                        errorExprHeader.setAttribute('key', 'errorExpression');
                        errorExprHeader.setAttribute('value', headers.errorExpression);
                        taskHeaders.appendChild(errorExprHeader);
                    }

                    extensionElements.appendChild(taskHeaders);
                }

                // Add I/O mappings if present
                const inputMappings = elementInputMappings.get(taskId);
                const outputMappings = elementOutputMappings.get(taskId);
                const hasInputMappings = inputMappings && inputMappings.length > 0;
                const hasOutputMappings = outputMappings && outputMappings.length > 0;

                if (hasInputMappings || hasOutputMappings) {
                    const ioMapping = xml.createElementNS(zeebeNS, 'zeebe:ioMapping');

                    if (hasInputMappings) {
                        for (const mapping of inputMappings) {
                            if (mapping.target && mapping.source) {
                                const inputElement = xml.createElementNS(zeebeNS, 'zeebe:input');
                                let sourceExpr = mapping.source.trim();
                                if (!sourceExpr.startsWith('=')) {
                                    sourceExpr = '=' + sourceExpr;
                                }
                                inputElement.setAttribute('source', sourceExpr);
                                inputElement.setAttribute('target', mapping.target);
                                ioMapping.appendChild(inputElement);
                            }
                        }
                    }

                    if (hasOutputMappings) {
                        for (const mapping of outputMappings) {
                            if (mapping.target && mapping.source) {
                                const outputElement = xml.createElementNS(zeebeNS, 'zeebe:output');
                                let sourceExpr = mapping.source.trim();
                                if (!sourceExpr.startsWith('=')) {
                                    sourceExpr = '=' + sourceExpr;
                                }
                                outputElement.setAttribute('source', sourceExpr);
                                outputElement.setAttribute('target', mapping.target);
                                ioMapping.appendChild(outputElement);
                            }
                        }
                    }

                    extensionElements.appendChild(ioMapping);
                }
        }
    }

    // Helper function to add I/O mappings to any BPMN element
    function addIOMappingsToElement(element) {
        const elementId = element.getAttribute('id');
        const inputMappings = elementInputMappings.get(elementId);
        const outputMappings = elementOutputMappings.get(elementId);
        const hasInputMappings = inputMappings && inputMappings.length > 0;
        const hasOutputMappings = outputMappings && outputMappings.length > 0;
        if (!hasInputMappings && !hasOutputMappings) return;

        let extensionElements = element.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            element.insertBefore(extensionElements, element.firstChild);
        }

        // Check if ioMapping already exists
        let ioMapping = extensionElements.getElementsByTagNameNS(zeebeNS, 'ioMapping')[0];
        if (!ioMapping) {
            ioMapping = xml.createElementNS(zeebeNS, 'zeebe:ioMapping');
            extensionElements.appendChild(ioMapping);
        }

        if (hasInputMappings) {
            for (const mapping of inputMappings) {
                if (mapping.target && mapping.source) {
                    const inputElement = xml.createElementNS(zeebeNS, 'zeebe:input');
                    let sourceExpr = mapping.source.trim();
                    if (!sourceExpr.startsWith('=')) {
                        sourceExpr = '=' + sourceExpr;
                    }
                    inputElement.setAttribute('source', sourceExpr);
                    inputElement.setAttribute('target', mapping.target);
                    ioMapping.appendChild(inputElement);
                }
            }
        }

        if (hasOutputMappings) {
            for (const mapping of outputMappings) {
                if (mapping.target && mapping.source) {
                    const outputElement = xml.createElementNS(zeebeNS, 'zeebe:output');
                    let sourceExpr = mapping.source.trim();
                    if (!sourceExpr.startsWith('=')) {
                        sourceExpr = '=' + sourceExpr;
                    }
                    outputElement.setAttribute('source', sourceExpr);
                    outputElement.setAttribute('target', mapping.target);
                    ioMapping.appendChild(outputElement);
                }
            }
        }
    }

    // Add I/O mappings to tasks (non-service tasks)
    const tasks = xml.getElementsByTagNameNS(bpmnNS, 'task');
    for (let i = 0; i < tasks.length; i++) {
        addIOMappingsToElement(tasks[i]);
    }

    // Add I/O mappings to user tasks
    const userTasks = xml.getElementsByTagNameNS(bpmnNS, 'userTask');
    for (let i = 0; i < userTasks.length; i++) {
        addIOMappingsToElement(userTasks[i]);
    }

    // Add I/O mappings to script tasks
    const scriptTasks = xml.getElementsByTagNameNS(bpmnNS, 'scriptTask');
    for (let i = 0; i < scriptTasks.length; i++) {
        addIOMappingsToElement(scriptTasks[i]);
    }

    // Add I/O mappings to events
    const eventTypes = ['startEvent', 'endEvent', 'intermediateCatchEvent', 'intermediateThrowEvent', 'boundaryEvent'];
    for (const eventType of eventTypes) {
        const events = xml.getElementsByTagNameNS(bpmnNS, eventType);
        for (let i = 0; i < events.length; i++) {
            addIOMappingsToElement(events[i]);
        }
    }

    // Add Zeebe extensions for boundary events (required by Camunda 8)
    const boundaryEvents = xml.getElementsByTagNameNS(bpmnNS, 'boundaryEvent');
    for (let i = 0; i < boundaryEvents.length; i++) {
        const boundaryEvent = boundaryEvents[i];
        const eventId = boundaryEvent.getAttribute('id');

        // Check what type of event definition exists
        const timerEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'timerEventDefinition')[0];
        const errorEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'errorEventDefinition')[0];

        if (timerEventDef) {
            // For timer boundary events, add a default timer duration if not present
            const hasTimeDuration = timerEventDef.getElementsByTagNameNS(bpmnNS, 'timeDuration')[0];
            const hasTimeCycle = timerEventDef.getElementsByTagNameNS(bpmnNS, 'timeCycle')[0];
            const hasTimeDate = timerEventDef.getElementsByTagNameNS(bpmnNS, 'timeDate')[0];

            if (!hasTimeDuration && !hasTimeCycle && !hasTimeDate) {
                // Add default timer duration (PT1M = 1 minute)
                const timeDuration = xml.createElementNS(bpmnNS, 'bpmn:timeDuration');
                timeDuration.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'bpmn:tFormalExpression');
                timeDuration.textContent = 'PT1M';
                timerEventDef.appendChild(timeDuration);
                console.log(`Added default timer duration to boundary event: ${eventId}`);
            }
        }

        if (errorEventDef) {
            // For error boundary events, ensure there's an error reference
            // Camunda 8 requires either an errorRef or errorCode
            const errorRef = errorEventDef.getAttribute('errorRef');
            if (!errorRef) {
                // Add a catch-all error code (empty means catch all errors)
                // For Camunda 8, we can leave errorRef empty which catches all errors
                console.log(`Error boundary event ${eventId} will catch all errors`);
            }
        }

        // If boundary event has no event definition at all, it's a generic boundary event
        // which Camunda 8 doesn't support - add a timer definition as default
        if (!timerEventDef && !errorEventDef) {
            const messageEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'messageEventDefinition')[0];
            const signalEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'signalEventDefinition')[0];
            const escalationEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'escalationEventDefinition')[0];
            const conditionalEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'conditionalEventDefinition')[0];
            const compensateEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'compensateEventDefinition')[0];
            const cancelEventDef = boundaryEvent.getElementsByTagNameNS(bpmnNS, 'cancelEventDefinition')[0];

            if (!messageEventDef && !signalEventDef && !escalationEventDef &&
                !conditionalEventDef && !compensateEventDef && !cancelEventDef) {
                // Generic boundary event without definition - add timer as default
                console.warn(`Boundary event ${eventId} has no event definition - adding default timer`);
                const timerDef = xml.createElementNS(bpmnNS, 'bpmn:timerEventDefinition');
                const timeDuration = xml.createElementNS(bpmnNS, 'bpmn:timeDuration');
                timeDuration.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'bpmn:tFormalExpression');
                timeDuration.textContent = 'PT1M';
                timerDef.appendChild(timeDuration);
                boundaryEvent.appendChild(timerDef);
            }
        }
    }

    // Add Zeebe extensions for intermediate catch events (required by Camunda 8)
    const intermediateCatchEvents = xml.getElementsByTagNameNS(bpmnNS, 'intermediateCatchEvent');
    for (let i = 0; i < intermediateCatchEvents.length; i++) {
        const catchEvent = intermediateCatchEvents[i];
        const eventId = catchEvent.getAttribute('id');

        // Check what type of event definition exists
        const timerEventDef = catchEvent.getElementsByTagNameNS(bpmnNS, 'timerEventDefinition')[0];
        const messageEventDef = catchEvent.getElementsByTagNameNS(bpmnNS, 'messageEventDefinition')[0];

        if (timerEventDef) {
            // For timer intermediate catch events, add a default timer duration if not present
            const hasTimeDuration = timerEventDef.getElementsByTagNameNS(bpmnNS, 'timeDuration')[0];
            const hasTimeCycle = timerEventDef.getElementsByTagNameNS(bpmnNS, 'timeCycle')[0];
            const hasTimeDate = timerEventDef.getElementsByTagNameNS(bpmnNS, 'timeDate')[0];

            if (!hasTimeDuration && !hasTimeCycle && !hasTimeDate) {
                // Add default timer duration (PT1M = 1 minute)
                const timeDuration = xml.createElementNS(bpmnNS, 'bpmn:timeDuration');
                timeDuration.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'bpmn:tFormalExpression');
                timeDuration.textContent = 'PT1M';
                timerEventDef.appendChild(timeDuration);
                console.log(`Added default timer duration to intermediate catch event: ${eventId}`);
            }
        }

        if (messageEventDef) {
            // For message intermediate catch events, ensure there's a message reference
            // and add zeebe:subscription if needed
            const messageRef = messageEventDef.getAttribute('messageRef');
            if (!messageRef) {
                // Create a message element and reference it
                const messageId = `Message_${eventId}`;

                // Check if we need to add zeebe subscription
                let extensionElements = catchEvent.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
                if (!extensionElements) {
                    extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
                    catchEvent.insertBefore(extensionElements, catchEvent.firstChild);
                }

                // Check if subscription already exists
                const existingSubscription = extensionElements.getElementsByTagNameNS(zeebeNS, 'subscription')[0];
                if (!existingSubscription) {
                    // Add zeebe:subscription with default correlation key
                    const subscription = xml.createElementNS(zeebeNS, 'zeebe:subscription');
                    subscription.setAttribute('correlationKey', '=correlationKey');
                    extensionElements.appendChild(subscription);
                    console.log(`Added zeebe:subscription to message catch event: ${eventId}`);
                }
            }
        }
    }

    // Add zeebe:taskDefinition for business rule tasks (required by Camunda 8)
    const businessRuleTasks = xml.getElementsByTagNameNS(bpmnNS, 'businessRuleTask');
    for (let i = 0; i < businessRuleTasks.length; i++) {
        const task = businessRuleTasks[i];
        const taskId = task.getAttribute('id');
        const taskName = task.getAttribute('name') || 'businessRuleTask';

        let extensionElements = task.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            task.insertBefore(extensionElements, task.firstChild);
        }

        const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
        if (!existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', taskName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to business rule task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for script tasks (required by Camunda 8)
    const scriptTasks2 = xml.getElementsByTagNameNS(bpmnNS, 'scriptTask');
    for (let i = 0; i < scriptTasks2.length; i++) {
        const task = scriptTasks2[i];
        const taskId = task.getAttribute('id');
        const taskName = task.getAttribute('name') || 'scriptTask';

        let extensionElements = task.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            task.insertBefore(extensionElements, task.firstChild);
        }

        const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
        if (!existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', taskName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to script task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for user tasks (required by Camunda 8)
    const userTasks2 = xml.getElementsByTagNameNS(bpmnNS, 'userTask');
    for (let i = 0; i < userTasks2.length; i++) {
        const task = userTasks2[i];
        const taskId = task.getAttribute('id');

        let extensionElements = task.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            task.insertBefore(extensionElements, task.firstChild);
        }

        // User tasks in Camunda 8 need zeebe:userTask extension (not taskDefinition)
        const existingUserTask = extensionElements.getElementsByTagNameNS(zeebeNS, 'userTask')[0];
        if (!existingUserTask) {
            const userTaskExt = xml.createElementNS(zeebeNS, 'zeebe:userTask');
            extensionElements.appendChild(userTaskExt);
            console.log(`Added zeebe:userTask to user task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for manual tasks (required by Camunda 8 - treated as service tasks)
    const manualTasks = xml.getElementsByTagNameNS(bpmnNS, 'manualTask');
    for (let i = 0; i < manualTasks.length; i++) {
        const task = manualTasks[i];
        const taskId = task.getAttribute('id');
        const taskName = task.getAttribute('name') || 'manualTask';

        let extensionElements = task.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            task.insertBefore(extensionElements, task.firstChild);
        }

        const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
        if (!existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', taskName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to manual task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for generic tasks (required by Camunda 8)
    const genericTasks = xml.getElementsByTagNameNS(bpmnNS, 'task');
    for (let i = 0; i < genericTasks.length; i++) {
        const task = genericTasks[i];
        const taskId = task.getAttribute('id');
        const taskName = task.getAttribute('name') || 'task';

        let extensionElements = task.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            task.insertBefore(extensionElements, task.firstChild);
        }

        const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
        if (!existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', taskName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to generic task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for send tasks (required by Camunda 8)
    const sendTasks = xml.getElementsByTagNameNS(bpmnNS, 'sendTask');
    for (let i = 0; i < sendTasks.length; i++) {
        const sendTask = sendTasks[i];
        const taskId = sendTask.getAttribute('id');
        const taskName = sendTask.getAttribute('name') || 'sendTask';

        let extensionElements = sendTask.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            sendTask.insertBefore(extensionElements, sendTask.firstChild);
        }

        // Check if taskDefinition already exists
        const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
        if (!existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', taskName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to send task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for receive tasks (required by Camunda 8)
    const receiveTasks = xml.getElementsByTagNameNS(bpmnNS, 'receiveTask');
    for (let i = 0; i < receiveTasks.length; i++) {
        const receiveTask = receiveTasks[i];
        const taskId = receiveTask.getAttribute('id');

        let extensionElements = receiveTask.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            receiveTask.insertBefore(extensionElements, receiveTask.firstChild);
        }

        // Check if subscription already exists (receive tasks need message correlation)
        const existingSubscription = extensionElements.getElementsByTagNameNS(zeebeNS, 'subscription')[0];
        if (!existingSubscription) {
            const subscription = xml.createElementNS(zeebeNS, 'zeebe:subscription');
            subscription.setAttribute('correlationKey', '=correlationKey');
            extensionElements.appendChild(subscription);
            console.log(`Added zeebe:subscription to receive task: ${taskId}`);
        }
    }

    // Add zeebe:taskDefinition for intermediate throwing events (required by Camunda 8)
    const intermediateThrowEvents = xml.getElementsByTagNameNS(bpmnNS, 'intermediateThrowEvent');
    for (let i = 0; i < intermediateThrowEvents.length; i++) {
        const throwEvent = intermediateThrowEvents[i];
        const eventId = throwEvent.getAttribute('id');
        const eventName = throwEvent.getAttribute('name') || 'intermediateThrowEvent';

        // Check if this is a message throw event
        const messageEventDef = throwEvent.getElementsByTagNameNS(bpmnNS, 'messageEventDefinition')[0];
        // Check for other throw event types
        const signalEventDef = throwEvent.getElementsByTagNameNS(bpmnNS, 'signalEventDefinition')[0];
        const escalationEventDef = throwEvent.getElementsByTagNameNS(bpmnNS, 'escalationEventDefinition')[0];

        let extensionElements = throwEvent.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) {
            extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
            throwEvent.insertBefore(extensionElements, throwEvent.firstChild);
        }

        // Check if taskDefinition already exists
        const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];

        if (messageEventDef && !existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', 'io.camunda:sendgrid:1');
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to message throw event: ${eventId}`);
        } else if (signalEventDef && !existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', eventName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to signal throw event: ${eventId}`);
        } else if (escalationEventDef && !existingTaskDef) {
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', eventName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to escalation throw event: ${eventId}`);
        } else if (!messageEventDef && !signalEventDef && !escalationEventDef && !existingTaskDef) {
            // Generic intermediate throw event - add task definition
            const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
            taskDefinition.setAttribute('type', eventName);
            extensionElements.appendChild(taskDefinition);
            console.log(`Added zeebe:taskDefinition to generic throw event: ${eventId}`);
        }
    }

    // Add zeebe:taskDefinition for message end events (required by Camunda 8)
    const endEvents = xml.getElementsByTagNameNS(bpmnNS, 'endEvent');
    for (let i = 0; i < endEvents.length; i++) {
        const endEvent = endEvents[i];
        const eventId = endEvent.getAttribute('id');

        // Check if this is a message end event
        const messageEventDef = endEvent.getElementsByTagNameNS(bpmnNS, 'messageEventDefinition')[0];
        if (messageEventDef) {
            let extensionElements = endEvent.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
            if (!extensionElements) {
                extensionElements = xml.createElementNS(bpmnNS, 'bpmn:extensionElements');
                endEvent.insertBefore(extensionElements, endEvent.firstChild);
            }

            // Check if taskDefinition already exists
            const existingTaskDef = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
            if (!existingTaskDef) {
                const taskDefinition = xml.createElementNS(zeebeNS, 'zeebe:taskDefinition');
                taskDefinition.setAttribute('type', 'io.camunda:sendgrid:1');
                extensionElements.appendChild(taskDefinition);
                console.log(`Added zeebe:taskDefinition to message end event: ${eventId}`);
            }
        }
    }

    // Collect messageFlow IDs before removing them
    const messageFlowIds = new Set();
    const messageFlows = xml.getElementsByTagNameNS(bpmnNS, 'messageFlow');
    for (let i = 0; i < messageFlows.length; i++) {
        messageFlowIds.add(messageFlows[i].getAttribute('id'));
    }

    // Remove messageFlow elements (not supported by Camunda 8 Zeebe)
    while (messageFlows.length > 0) {
        messageFlows[0].parentNode.removeChild(messageFlows[0]);
    }

    // Remove corresponding BPMNEdge elements for message flows
    const edges = xml.getElementsByTagNameNS(bpmndiNS, 'BPMNEdge');
    for (let i = edges.length - 1; i >= 0; i--) {
        const edge = edges[i];
        const bpmnElement = edge.getAttribute('bpmnElement');
        if (messageFlowIds.has(bpmnElement)) {
            edge.parentNode.removeChild(edge);
        }
    }

    // Reorder child elements within each <process> to match BPMN 2.0 schema ordering.
    // The schema requires: flow elements first, then sequenceFlow, then artifacts.
    // Without this, Camunda rejects the XML with "Invalid content" errors.
    const flowElementTags = new Set([
        'startEvent', 'endEvent', 'task', 'serviceTask', 'userTask', 'scriptTask',
        'businessRuleTask', 'sendTask', 'receiveTask', 'subProcess', 'callActivity',
        'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway',
        'complexGateway', 'intermediateCatchEvent', 'intermediateThrowEvent', 'boundaryEvent',
        'manualTask', 'transaction', 'adHocSubProcess'
    ]);
    const sequenceFlowTag = 'sequenceFlow';
    const artifactTags = new Set(['association', 'textAnnotation', 'group']);

    for (let i = 0; i < processElements.length; i++) {
        const proc = processElements[i];
        const children = Array.from(proc.childNodes);

        const flowElements = [];
        const sequenceFlows = [];
        const artifacts = [];
        const other = [];

        for (const child of children) {
            if (child.nodeType !== 1) {
                // Non-element nodes (text, comments) — keep in "other"
                other.push(child);
                continue;
            }
            const localName = child.localName;
            if (flowElementTags.has(localName)) {
                flowElements.push(child);
            } else if (localName === sequenceFlowTag) {
                sequenceFlows.push(child);
            } else if (artifactTags.has(localName)) {
                artifacts.push(child);
            } else {
                other.push(child);
            }
        }

        // Re-append in correct order: other (laneSet, etc.), flow elements, sequenceFlows, artifacts
        for (const child of [...other, ...flowElements, ...sequenceFlows, ...artifacts]) {
            proc.appendChild(child);
        }
    }

    const xmlString = new XMLSerializer().serializeToString(xml);
    return xmlString;
}

function onDeployProcessClick(context, controller) {
    return __awaiter(this, void 0, void 0, function* () {
        const { paper, toolbar } = context;

        // Get process name from toolbar
        const processName = getProcessNameFromToolbar(toolbar);

        // Use the shared XML processing function
        const xmlString = processXMLWithZeebeExtensions(paper, processName);

        // Use process name for filename if available
        const filename = processName ? `${processName}.bpmn` : 'process.bpmn';

        const formData = new FormData();
        const blob = new Blob([xmlString], { type: 'application/xml' });
        formData.append('bpmn', blob, filename);

        try {
            const response = yield fetch('http://localhost:3000/api/deploy', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = yield response.text();
                throw new Error(errorText || response.statusText);
            }

            const result = yield response.json();
            console.log('Deployment result:', result);

            // Handle different response structures from Zeebe client
            let processKey = 'unknown';
            if (result.deployments && result.deployments.length > 0) {
                const deployment = result.deployments[0];
                if (deployment.process) {
                    processKey = deployment.process.processDefinitionKey;
                } else if (deployment.processDefinition) {
                    processKey = deployment.processDefinition.processDefinitionKey;
                }
            } else if (result.processDefinitionKey) {
                processKey = result.processDefinitionKey;
            }

            showNotification('success', 'Process Deployed', `Process deployed successfully.<br><b>Definition Key:</b> ${processKey}`);
        } catch (error) {
            showNotification('error', 'Deployment Failed', `Failed to deploy process:<br>${error.message}`);
        }
    });
}

function loadDeployedProcesses(controller) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Loading deployed processes from Zeebe...');
            const response = yield fetch('http://localhost:3000/api/processes');

            if (!response.ok) {
                console.error('Failed to load deployed processes:', response.status, response.statusText);
                return;
            }

            const result = yield response.json();
            controller.deployedProcesses = result.items || [];
            console.log(`Loaded ${controller.deployedProcesses.length} deployed processes:`, controller.deployedProcesses);
        } catch (error) {
            console.error('Error loading deployed processes:', error);
            controller.deployedProcesses = [];
        }
    });
}

function onLoadProcessDropdownClick(context, controller) {

    const { toolbar } = context;
    const processes = controller.deployedProcesses;

    if (processes.length === 0) {
        showNotification('info', 'No Processes', 'No deployed processes found. Please deploy a process first.');
        controller.isLoadProcessDropdownOpen = false;
        return null;
    }

    // Sort processes alphabetically by name (A to Z)
    const sortedProcesses = [...processes].sort((a, b) => {
        const nameA = (a.name || a.processDefinitionId || 'Unnamed Process').toLowerCase();
        const nameB = (b.name || b.processDefinitionId || 'Unnamed Process').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    const tools = sortedProcesses.map((proc, index) => {
        const displayName = proc.name || proc.processDefinitionId || 'Unnamed Process';
        return {
            action: `load_process_${index}`,
            content: `${displayName} (v${proc.version}) - Key: ${proc.processDefinitionKey}`
        };
    });

    const contextToolbar = new ui.ContextToolbar({
        target: toolbar.getWidgetByName(toolbarToolNames.LOAD_PROCESS_DROPDOWN).el,
        root: toolbar.el,
        className: 'context-toolbar load-process-dropdown',
        padding: 4,
        vertical: true,
        position: 'bottom-left',
        anchor: 'top-left',
        tools: tools
    });

    // Listen for action events to load the selected process
    sortedProcesses.forEach((proc, index) => {
        contextToolbar.on(`action:load_process_${index}`, () => {
            console.log('Loading process:', proc);
            loadProcessIntoCanvas(context, proc);
        });
    });

    contextToolbar.render();

    return contextToolbar;
}

function onStartProcessDropdownClick(context, controller) {
    const { toolbar } = context;

    const processes = controller.deployedProcesses;

    if (processes.length === 0) {
        showNotification('info', 'No Processes', 'No deployed processes found. Please deploy a process first.');
        controller.isStartProcessDropdownOpen = false;
        return null;
    }

    // Sort processes alphabetically by name (A to Z)
    const sortedProcesses = [...processes].sort((a, b) => {
        const nameA = (a.name || a.processDefinitionId || 'Unnamed Process').toLowerCase();
        const nameB = (b.name || b.processDefinitionId || 'Unnamed Process').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    const tools = sortedProcesses.map((proc, index) => {
        const displayName = proc.name || proc.processDefinitionId || 'Unnamed Process';
        return {
            action: `process_${index}`,
            content: `${displayName} (v${proc.version}) - Key: ${proc.processDefinitionKey}`
        };
    });

    const contextToolbar = new ui.ContextToolbar({
        target: toolbar.getWidgetByName(toolbarToolNames.START_PROCESS_DROPDOWN).el,
        root: toolbar.el,
        className: 'context-toolbar start-process-dropdown',
        padding: 4,
        vertical: true,
        position: 'bottom-left',
        anchor: 'top-left',
        tools: tools
    });

    // Listen for action events to start the selected process
    sortedProcesses.forEach((proc, index) => {
        contextToolbar.on(`action:process_${index}`, () => {
            console.log('Starting process:', proc);
            startProcessInstance(proc);
        });
    });

    contextToolbar.render();

    return contextToolbar;
}

function loadProcessIntoCanvas(context, process) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { paper, paperScroller, commandManager, toolbar } = context;

            console.log('Fetching BPMN XML for process key:', process.processDefinitionKey);

            const response = yield fetch(`http://localhost:3000/api/process-xml/${process.processDefinitionKey}`);

            if (!response.ok) {
                const errorText = yield response.text();
                throw new Error(errorText || response.statusText);
            }

            const result = yield response.json();
            console.log('Received XML result:', result);

            // The API returns { bpmnXml: "..." }
            const xmlString = result.bpmnXml;

            if (!xmlString) {
                throw new Error('No BPMN XML found in response');
            }

            // Parse the XML to extract Zeebe extensions before import
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
            const zeebeExtensions = extractZeebeExtensions(xmlDoc);

            console.log('Extracted Zeebe extensions:', zeebeExtensions);

            // Modify XML to mark HTTP Connector elements before import
            // This ensures they're created with the correct type during import
            markHttpConnectorsInXML(xmlDoc, zeebeExtensions);

            // Serialize the modified XML
            const modifiedXmlString = new XMLSerializer().serializeToString(xmlDoc);

            // Create a Blob and File from the modified XML string
            const blob = new Blob([modifiedXmlString], { type: 'application/xml' });
            const file = new File([blob], `${process.processDefinitionId}.bpmn`, { type: 'application/xml' });

            // Use the XMLFileImporter to load the BPMN
            const xmlFileImporter = new XMLFileImporter(paperScroller, commandManager);
            yield xmlFileImporter.import(file, paper.model);

            // After import, restore Zeebe extensions to the elements
            restoreZeebeExtensions(paper, zeebeExtensions);

            // Update process name in toolbar
            const processNameWidget = toolbar.getWidgetByName(toolbarToolNames.PROCESS_NAME);
            if (processNameWidget && processNameWidget.el) {
                const loadedProcessName = process.name || process.processDefinitionId || 'my_process';
                const inputEl = processNameWidget.el.querySelector('input');
                if (inputEl) {
                    inputEl.value = loadedProcessName;
                }
            }

            const displayName = process.name || process.processDefinitionId || 'Process';
            console.log(`Process "${displayName}" (v${process.version}) loaded successfully!`);
        } catch (error) {
            console.error('Error loading process:', error);
            showNotification('error', 'Load Failed', `Failed to load process:<br>${error.message}`);
        }
    });
}

function markHttpConnectorsInXML(xmlDoc, extensions) {
    const bpmnNS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
    const jointNS = 'http://jointjs.com/bpmn';

    // Add jointjs namespace to definitions if not present
    const definitions = xmlDoc.getElementsByTagNameNS(bpmnNS, 'definitions')[0];
    if (definitions && !definitions.getAttribute('xmlns:joint')) {
        definitions.setAttribute('xmlns:joint', jointNS);
    }

    // Mark all HTTP Connector tasks (may be serviceTask or sendTask depending on export version)
    const taskTypes = ['serviceTask', 'sendTask'];
    for (const taskType of taskTypes) {
        const tasks = xmlDoc.getElementsByTagNameNS(bpmnNS, taskType);

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const taskId = task.getAttribute('id');

            // Only mark tasks that are specifically HTTP Connectors (type === 'httpConnector')
            const extensionData = extensions.get(taskId);
            if (extensionData && extensionData.type === 'httpConnector') {
                // Add custom attribute to mark this as an HTTP Connector
                task.setAttributeNS(jointNS, 'joint:type', 'activity.HttpConnector');
                console.log(`✓ Marked ${taskType} ${taskId} as HTTP Connector in XML`);
            }
        }
    }
}

function extractZeebeExtensions(xmlDoc) {
    const extensions = new Map();
    const bpmnNS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
    const zeebeNS = 'http://camunda.org/schema/zeebe/1.0';

    // Helper function to extract input mappings from an element
    // knownTargets: optional Set of target names to exclude (e.g. HTTP Connector built-in inputs)
    function extractInputMappings(element, knownTargets) {
        const extensionElements = element.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) return [];

        const ioMapping = extensionElements.getElementsByTagNameNS(zeebeNS, 'ioMapping')[0];
        if (!ioMapping) return [];

        const inputs = ioMapping.getElementsByTagNameNS(zeebeNS, 'input');
        const inputMappings = [];

        for (let j = 0; j < inputs.length; j++) {
            const input = inputs[j];
            let source = input.getAttribute('source');
            const target = input.getAttribute('target');

            // Skip known built-in targets (e.g. HTTP Connector config inputs)
            if (knownTargets && knownTargets.has(target)) continue;

            // Remove '=' prefix from FEEL expression for display
            if (source && source.startsWith('=')) {
                source = source.substring(1);
            }

            if (source && target) {
                inputMappings.push({ source, target });
            }
        }

        return inputMappings;
    }

    // Helper function to extract output mappings from an element
    function extractOutputMappings(element) {
        const extensionElements = element.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];
        if (!extensionElements) return [];

        const ioMapping = extensionElements.getElementsByTagNameNS(zeebeNS, 'ioMapping')[0];
        if (!ioMapping) return [];

        const outputs = ioMapping.getElementsByTagNameNS(zeebeNS, 'output');
        const outputMappings = [];

        for (let j = 0; j < outputs.length; j++) {
            const output = outputs[j];
            let source = output.getAttribute('source');
            const target = output.getAttribute('target');

            // Remove '=' prefix from FEEL expression for display
            if (source && source.startsWith('=')) {
                source = source.substring(1);
            }

            if (source && target) {
                outputMappings.push({ source, target });
            }
        }

        return outputMappings;
    }

    // Find all service tasks and send tasks (HTTP Connectors may be exported as either type)
    const serviceTaskTypes = ['serviceTask', 'sendTask'];
    const allServiceTasks = [];
    for (const taskType of serviceTaskTypes) {
        const tasks = xmlDoc.getElementsByTagNameNS(bpmnNS, taskType);
        for (let i = 0; i < tasks.length; i++) {
            allServiceTasks.push(tasks[i]);
        }
    }

    console.log(`Found ${allServiceTasks.length} service/send tasks in XML`);

    for (let i = 0; i < allServiceTasks.length; i++) {
        const serviceTask = allServiceTasks[i];
        const taskId = serviceTask.getAttribute('id');
        const modelerTemplate = serviceTask.getAttributeNS(zeebeNS, 'modelerTemplate') ||
            serviceTask.getAttribute('zeebe:modelerTemplate');

        console.log(`Task ${i}: id="${taskId}", modelerTemplate="${modelerTemplate}"`);

        const extensionElements = serviceTask.getElementsByTagNameNS(bpmnNS, 'extensionElements')[0];

        // Extract output mappings for all service tasks
        const outputMappings = extractOutputMappings(serviceTask);

        // Known HTTP Connector built-in input targets (not user-defined input mappings)
        const httpConnectorBuiltinTargets = new Set([
            'authentication.type', 'method', 'url', 'headers', 'queryParameters', 'body',
            'storeResponse', 'connectionTimeoutInSeconds', 'readTimeoutInSeconds',
            'writeTimeoutInSeconds', 'ignoreNullValues'
        ]);

        // Check if this is an HTTP Connector
        if (modelerTemplate === 'io.camunda.connectors.HttpJson.v2') {
            if (!extensionElements) continue;

            const httpConfig = {};
            let retries = 3; // default value
            let retryBackoff = 'PT0S'; // default value

            // Extract retries from taskDefinition
            const taskDefinition = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskDefinition')[0];
            if (taskDefinition) {
                const retriesAttr = taskDefinition.getAttribute('retries');
                if (retriesAttr) {
                    retries = parseInt(retriesAttr, 10);
                    if (isNaN(retries)) retries = 3;
                }
            }

            // Extract from ioMapping
            const ioMapping = extensionElements.getElementsByTagNameNS(zeebeNS, 'ioMapping')[0];
            if (ioMapping) {
                const inputs = ioMapping.getElementsByTagNameNS(zeebeNS, 'input');
                for (let j = 0; j < inputs.length; j++) {
                    const input = inputs[j];
                    const target = input.getAttribute('target');
                    let source = input.getAttribute('source');

                    // Remove FEEL expression wrapper if present
                    // Handles both =value, ="value", and ='value' formats
                    if (source && source.startsWith('=')) {
                        source = source.substring(1);
                        // Remove quotes if present (both single and double)
                        if ((source.startsWith('"') && source.endsWith('"')) ||
                            (source.startsWith("'") && source.endsWith("'"))) {
                            source = source.substring(1, source.length - 1);
                        }
                    }

                    if (target === 'method') {
                        httpConfig.method = source;
                    } else if (target === 'url') {
                        httpConfig.url = source;
                    } else if (target === 'headers') {
                        httpConfig.headers = source;
                    } else if (target === 'queryParameters') {
                        httpConfig.queryParams = source;
                    } else if (target === 'body') {
                        httpConfig.body = source;
                    } else if (target === 'connectionTimeoutInSeconds') {
                        const parsed = parseInt(source, 10);
                        httpConfig.connectionTimeoutInSeconds = isNaN(parsed) ? 20 : parsed;
                    } else if (target === 'readTimeoutInSeconds') {
                        const parsed = parseInt(source, 10);
                        httpConfig.readTimeoutInSeconds = isNaN(parsed) ? 20 : parsed;
                    } else if (target === 'writeTimeoutInSeconds') {
                        const parsed = parseInt(source, 10);
                        httpConfig.writeTimeoutInSeconds = isNaN(parsed) ? 0 : parsed;
                    }
                }
            }

            // Extract from taskHeaders
            let resultExpression = '';
            let errorExpression = '';
            const taskHeaders = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskHeaders')[0];
            if (taskHeaders) {
                const headers = taskHeaders.getElementsByTagNameNS(zeebeNS, 'header');
                for (let j = 0; j < headers.length; j++) {
                    const header = headers[j];
                    const key = header.getAttribute('key');
                    const value = header.getAttribute('value');

                    if (key === 'resultVariable') {
                        httpConfig.resultVariable = value;
                    } else if (key === 'resultExpression') {
                        resultExpression = value;
                    } else if (key === 'errorExpression') {
                        errorExpression = value;
                    } else if (key === 'retryBackoff') {
                        retryBackoff = value;
                    }
                }
            }

            // Extract user-defined input mappings (excluding built-in connector inputs)
            const inputMappings = extractInputMappings(serviceTask, httpConnectorBuiltinTargets);

            if (Object.keys(httpConfig).length > 0 || inputMappings.length > 0 || outputMappings.length > 0) {
                extensions.set(taskId, {
                    type: 'httpConnector',
                    config: httpConfig,
                    resultExpression,
                    errorExpression,
                    retries,
                    retryBackoff,
                    inputMappings,
                    outputMappings
                });
            }
        } else {
            // Regular service task - extract Zeebe headers if present
            const zeebeHeaders = {};

            if (extensionElements) {
                const taskHeaders = extensionElements.getElementsByTagNameNS(zeebeNS, 'taskHeaders')[0];
                if (taskHeaders) {
                    const headers = taskHeaders.getElementsByTagNameNS(zeebeNS, 'header');

                    for (let j = 0; j < headers.length; j++) {
                        const header = headers[j];
                        const key = header.getAttribute('key');
                        const value = header.getAttribute('value');

                        if (key === 'resultExpression') {
                            zeebeHeaders.resultExpression = value;
                        } else if (key === 'errorExpression') {
                            zeebeHeaders.errorExpression = value;
                        }
                    }
                }
            }

            const inputMappings = extractInputMappings(serviceTask);

            if (zeebeHeaders.resultExpression || zeebeHeaders.errorExpression || inputMappings.length > 0 || outputMappings.length > 0) {
                extensions.set(taskId, {
                    type: 'serviceTask',
                    zeebeHeaders: zeebeHeaders,
                    inputMappings,
                    outputMappings
                });
                console.log(`Extracted Zeebe extensions for service task ${taskId}:`, zeebeHeaders, inputMappings, outputMappings);
            }
        }
    }

    // Extract I/O mappings from other element types (tasks, events)
    const elementTypes = ['task', 'userTask', 'scriptTask', 'startEvent', 'endEvent', 'intermediateCatchEvent', 'intermediateThrowEvent', 'boundaryEvent'];
    for (const elementType of elementTypes) {
        const elements = xmlDoc.getElementsByTagNameNS(bpmnNS, elementType);
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const elementId = element.getAttribute('id');

            // Skip if already processed (service tasks are handled above)
            if (extensions.has(elementId)) continue;

            const inputMappings = extractInputMappings(element);
            const outputMappings = extractOutputMappings(element);
            if (inputMappings.length > 0 || outputMappings.length > 0) {
                extensions.set(elementId, {
                    type: 'element',
                    inputMappings,
                    outputMappings
                });
                console.log(`Extracted I/O mappings for ${elementType} ${elementId}:`, inputMappings, outputMappings);
            }
        }
    }

    return extensions;
}

function restoreZeebeExtensions(paper, extensions) {
    // Iterate through all elements in the paper
    const elements = paper.model.getElements();

    console.log('Restoring extensions, available extension IDs:', Array.from(extensions.keys()));

    const restoredElements = [];

    for (const element of elements) {
        // Element IDs start with underscore, toBPMN adds 'id_' prefix
        // So element.id="_abc" matches BPMN id="id__abc"
        const bpmnId = element.get('bpmnId') || ('id_' + element.id);
        const extensionData = extensions.get(bpmnId);

        console.log('Checking element:', element.id, 'computed bpmnId:', bpmnId, 'actual bpmnId:', element.get('bpmnId'), 'has extension:', !!extensionData);

        if (extensionData && extensionData.type === 'httpConnector') {
            console.log('✓ Restoring HTTP Connector config for element:', bpmnId, extensionData.config);

            // Set the httpConfig property first
            element.set('httpConfig', extensionData.config);

            // Set result and error expressions
            if (extensionData.resultExpression) {
                element.set('resultExpression', extensionData.resultExpression);
            }
            if (extensionData.errorExpression) {
                element.set('errorExpression', extensionData.errorExpression);
            }

            // Set retries and retryBackoff
            if (extensionData.retries !== undefined) {
                element.set('retries', extensionData.retries);
            }
            if (extensionData.retryBackoff) {
                element.set('retryBackoff', extensionData.retryBackoff);
            }

            // Set input mappings
            if (extensionData.inputMappings && extensionData.inputMappings.length > 0) {
                element.set('inputMappings', extensionData.inputMappings);
                console.log('✓ Restored input mappings for HTTP Connector:', bpmnId, extensionData.inputMappings);
            }

            // Set output mappings
            if (extensionData.outputMappings && extensionData.outputMappings.length > 0) {
                element.set('outputMappings', extensionData.outputMappings);
                console.log('✓ Restored output mappings for HTTP Connector:', bpmnId, extensionData.outputMappings);
            }

            // Then change the element type to HttpConnector
            // Using silent: false to trigger change events
            element.set('type', 'activity.HttpConnector', { silent: false });

            // Find the element view and force a re-render
            const elementView = paper.findViewByModel(element);
            if (elementView) {
                elementView.update();
                console.log('✓ Updated view for element:', bpmnId);
            }

            restoredElements.push(element);
        } else if (extensionData && extensionData.type === 'serviceTask') {
            console.log('✓ Restoring Zeebe headers for service task:', bpmnId, extensionData.zeebeHeaders);

            // Set the individual properties
            if (extensionData.zeebeHeaders && extensionData.zeebeHeaders.resultExpression) {
                element.set('resultExpression', extensionData.zeebeHeaders.resultExpression);
            }
            if (extensionData.zeebeHeaders && extensionData.zeebeHeaders.errorExpression) {
                element.set('errorExpression', extensionData.zeebeHeaders.errorExpression);
            }

            // Set input mappings
            if (extensionData.inputMappings && extensionData.inputMappings.length > 0) {
                element.set('inputMappings', extensionData.inputMappings);
                console.log('✓ Restored input mappings for service task:', bpmnId, extensionData.inputMappings);
            }

            // Set output mappings
            if (extensionData.outputMappings && extensionData.outputMappings.length > 0) {
                element.set('outputMappings', extensionData.outputMappings);
                console.log('✓ Restored output mappings for service task:', bpmnId, extensionData.outputMappings);
            }

            restoredElements.push(element);
        } else if (extensionData && extensionData.type === 'element') {
            // Generic element with I/O mappings (tasks, events, etc.)
            if (extensionData.inputMappings && extensionData.inputMappings.length > 0) {
                element.set('inputMappings', extensionData.inputMappings);
                console.log('✓ Restored input mappings for element:', bpmnId, extensionData.inputMappings);
            }
            if (extensionData.outputMappings && extensionData.outputMappings.length > 0) {
                element.set('outputMappings', extensionData.outputMappings);
                console.log('✓ Restored output mappings for element:', bpmnId, extensionData.outputMappings);
            }
            if ((extensionData.inputMappings && extensionData.inputMappings.length > 0) ||
                (extensionData.outputMappings && extensionData.outputMappings.length > 0)) {
                restoredElements.push(element);
            }
        }
    }

    console.log(`Restored Zeebe extensions for ${extensions.size} elements`);

    // Trigger a change event on the paper to notify observers
    if (restoredElements.length > 0) {
        paper.trigger('element:type:changed', restoredElements);
    }
}

function startProcessInstance(process) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Use bpmnProcessId instead of processDefinitionKey for better reliability
            const response = yield fetch('http://localhost:3000/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bpmnProcessId: process.processDefinitionId,
                    version: process.version,
                    variables: {}
                })
            });

            if (!response.ok) {
                const errorText = yield response.text();
                throw new Error(errorText || response.statusText);
            }

            const result = yield response.json();
            showNotification('success', 'Process Started', `Process instance started successfully.<br><b>Instance Key:</b> ${result.processInstanceKey}`);
        } catch (error) {
            showNotification('error', 'Start Failed', `Failed to start process:<br>${error.message}`);
        }
    });
}

// helper functions

function loadFromXML(context) {
    const { paper, paperScroller, commandManager } = context;

    return () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.bpmn, .xml';

        input.click();

        input.onchange = () => __awaiter(this, void 0, void 0, function* () {
            var _a;

            const file = (_a = input.files) === null || _a === void 0 ? void 0 : _a[0];

            if (!file)
                return;

            // Read the file content as text
            const xmlString = yield file.text();

            // Parse XML to extract Zeebe extensions before import
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
            const zeebeExtensions = extractZeebeExtensions(xmlDoc);
            console.log('Extracted Zeebe extensions from local file:', zeebeExtensions);

            // Mark HTTP Connector elements in XML so they import with correct type
            markHttpConnectorsInXML(xmlDoc, zeebeExtensions);

            // Serialize the modified XML and create a new File for import
            const modifiedXmlString = new XMLSerializer().serializeToString(xmlDoc);
            const blob = new Blob([modifiedXmlString], { type: 'application/xml' });
            const modifiedFile = new File([blob], file.name, { type: 'application/xml' });

            // Import the modified BPMN
            const xmlFileImporter = new XMLFileImporter(paperScroller, commandManager);
            yield xmlFileImporter.import(modifiedFile, paper.model);

            // Restore Zeebe extensions to the imported elements
            restoreZeebeExtensions(paper, zeebeExtensions);
            console.log('Restored Zeebe extensions from local file import');

            ui.ContextToolbar.close();
        });
    };
}
