# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack application combining a JointJS+ BPMN Editor (frontend) with a Node.js/Express middleware server that integrates with Camunda 8 Zeebe for workflow orchestration.

## Build & Run Commands

### Backend Server (Express + Camunda)
```bash
node server.js    # Runs on port 3000
```

### Frontend Modeler (Webpack)
```bash
cd modeler
npm install
npm start         # Runs webpack-dev-server on port 8080
npm run build     # Creates dist/bundle.js
```

### Environment
- Backend: http://localhost:3000
- Frontend: http://localhost:8080
- Camunda: http://localhost:8088 (Operate UI), gRPC on 26500

## Architecture

### Two-Tier Structure
```
/server.js              # Express API with Zeebe client for Camunda integration
/modeler/               # Frontend BPMN editor (JointJS+ based)
/lib/                   # Local JointJS+ v4.2.1 library
```

### Backend API Endpoints
- `POST /api/deploy` - Deploy BPMN file to Camunda (uses Zeebe client)
- `GET /api/processes` - List all deployed process definitions
- `GET /api/process-xml/:key` - Get BPMN XML for a process definition
- `POST /api/start` - Start process instance (uses Zeebe client with bpmnProcessId)
- `GET /api/status/:key` - Get instance status and statistics (authenticated REST API)
- `GET /api/instances` - List all process instances (authenticated REST API)

### Frontend Architecture (Service + Controller Pattern)

**Services** (`modeler/src/services/`) - UI component management:
- `main-service.js` - Core JointJS graph/paper management
- `toolbar-service.js` - Top toolbar with save/export/import
- `stencil-service.js` - Left-side shape palette
- `inspector-service.js` - Right-side property panel (Content & Appearance tabs)
- `navigator-service.js` - Minimap
- `halo-service.js` - Element context menu

**Controllers** (`modeler/src/controllers/`) - Event handling:
- `toolbar-actions-controller.js` - Save/print/export/import operations
- `edit-controller.js` - Element and label editing
- `view-controller.js` - Selection and highlighting
- `keyboard-controller.js` - Undo/redo shortcuts

**Shapes** (`modeler/src/shapes/`) - BPMN 2.0 elements:
- Subdirectories: `activity/`, `event/`, `gateway/`, `flow/`, `data/`, `pool/`, `annotation/`, `group/`
- Each has `*-shapes.js` (class definitions) and `*-config.js` (configuration)
- `factories.js` - Factory functions for creating BPMN shapes

### Key Entry Points
- Backend: `/server.js`
- Frontend: `/modeler/index.js` exports `init()` function
- Bootstrap: `/modeler/src/app.js`

## Key Dependencies

- **@joint/plus** (v4.2.2) - Commercial visual diagramming library
- **@camunda8/zeebe** - Zeebe gRPC client for Camunda 8 integration
- **express** (v5) - Backend HTTP server
- **multer** - File upload handling for BPMN files
- **Webpack 5 + Babel 7** - Frontend build tooling

## Development Log

1. Add a new button "Start Process" to the modeler UI toolbar. Clicking this button should call http://localhost:3000/api/deploy with the current BPMN process (exported to BPMN XML) in the body.
2. Fix CORS error: "Access to fetch at 'http://localhost:3000/api/deploy' from origin 'http://localhost:8080' has been blocked by CORS policy."
3. Fix Camunda deploy error: "Must contain at least one executable process" — set `isExecutable="true"` on process elements.
4. Fix Camunda deploy error: "MessageFlowImpl cannot be cast to SequenceFlow" — remove message flows from BPMN XML before deploying.
5. Fix Camunda deploy error: "Unable to find a model element instance for id" — properly track and remove BPMNEdge elements for deleted message flows.
6. Fix Camunda deploy error: "Must have exactly one 'zeebe:taskDefinition' extension element" — add `zeebe:taskDefinition` to all service tasks.
7. Modify the code to use the "name" of the serviceTask as the "type" of the zeebe:taskDefinition instead of hardcoding jointjs.demo.
8. Update the stencil (palette with BPMN elements) with just the following elements: Start, End, Sequence Flow, Service Task, Timer / Error boundary events and Exclusive Gateway.
9. Add tooltip to each stencil element with a description of what it does.
10. Add "Make Request (HTTP Connector)" element to the stencil with custom properties (URL, Method, Headers, Query Parameters, Body, Result Variable Name) and configure it to export as BPMN serviceTask with Zeebe HTTP connector extensions including zeebe:modelerTemplate, zeebe:ioMapping, and zeebe:taskHeaders.
11. Add a "Clear Diagram" button to the toolbar that clears the diagram with a confirmation prompt.
12. Update server.js to use Zeebe client for all operations instead of direct HTTP calls, ensuring proper authentication with OAuth tokens for both gRPC (deploy, start) and REST API (query) operations.
13. Rename "Start Process" button to "Deploy Process" since it deploys the process to Camunda.
14. Add a "Start Process" dropdown button that shows all deployed processes from Zeebe and allows starting a selected process instance using bpmnProcessId and version (more reliable than processDefinitionKey).
15. Make the process dropdown wider (700px, max-width 90vw) and display process name, version, and definition key.
16. Add a "Load Process" dropdown button to load deployed BPMN diagrams from Camunda back into the modeler for editing.
17. Add `/api/processes` endpoint to list all deployed process definitions from Camunda.
18. Add `/api/process-xml/:key` endpoint to fetch BPMN XML for a specific process definition.
19. Update "Save as XML" functionality to include Zeebe extensions (same processing as deploy), allowing local validation of exported BPMN with proper zeebe:taskDefinition, zeebe:ioMapping, and zeebe:taskHeaders.
20. Fix FEEL expression formatting: Use double quotes for string literals (`="GET"`) as required by FEEL spec. The XML entity encoding (`&quot;`) is correct and will be decoded by Camunda.
21. Fix element ID prefix matching: JointJS element IDs start with underscore (`_abc`), toBPMN adds `id_` prefix, resulting in `id__abc` (two underscores total). Use `'id_' + element.id` for correct matching.
22. Implement bidirectional Zeebe extension support: Extract zeebe:ioMapping and zeebe:taskHeaders from imported BPMN XML and restore httpConfig properties to HTTP Connector elements.
23. Fix import to properly restore HTTP Connector elements: Pre-process XML before import by adding `joint:type="activity.HttpConnector"` attribute to service tasks with `zeebe:modelerTemplate="io.camunda.connectors.HttpJson.v2"`, ensuring elements are created with correct type during import so Inspector panel displays HTTP Connector properties correctly.
24. Add process name text field to toolbar allowing users to name their process. The name is used as both the BPMN process ID (sanitized) and process name when deploying or exporting to XML. When loading a process from Camunda, the toolbar input is updated with the loaded process name.
25. Add condition expression field to Sequence and Conditional flow shapes. The inspector's Content tab displays a FEEL expression textarea for these links. Sequence flows with a condition expression are automatically exported as conditional flows in BPMN XML. Condition expressions are preserved during import/export.
26. Add "View XML" button to toolbar that opens a dialog with Monaco Editor displaying the current BPMN XML source in read-only mode with syntax highlighting, folding, and minimap.
27. Add "Headers" section to Service Task inspector panel with "Result Expression" and "Error Expression" textarea fields. These fields are exported as Zeebe task headers (`resultExpression` and `errorExpression`) in the BPMN XML and restored during import.
28. Add "Output Mapping" section to the inspector panel for activities, service tasks, HTTP connectors, and events. The section includes a list widget with "Result Variable" (target) and "Result Expression" (source) text fields. Output mappings are exported as `zeebe:output` elements within `zeebe:ioMapping` in the BPMN XML. Result expressions are FEEL expressions and are automatically prefixed with "=" on export and stripped on import.
29. Fix boundary event type preservation when dropping from stencil onto activities. Previously, all boundary events were converted to generic `IntermediateBoundary`. Now the original event type (e.g., `ErrorIntermediateBoundary`, `TimerIntermediateBoundary`) is preserved by dynamically looking up the correct class in the shapes registry based on the model's type property.
30. Add "Retries" group to HTTP Connector inspector panel with "Retries" number field (default: 3) and "Retry Backoff" text field (default: "PT0S", ISO-8601 duration). Retries is exported to `zeebe:taskDefinition` retries attribute, and retryBackoff is exported to `zeebe:taskHeaders` as a header. Both values are restored during import.
31. Fix HTTP Connector elements loading as `activity.Send` instead of `activity.HttpConnector` when importing from Camunda. Root cause: the HttpConnector shape had `iconType: 'send'`, causing the BPMN export to produce `<sendTask>` elements instead of `<serviceTask>`. Changed iconType to `'service'` and added backward-compatible import handling for both `sendTask` and `serviceTask` elements in `extractZeebeExtensions`, `markHttpConnectorsInXML`, and the `sendTask` cell factory.
32. Fix View XML formatting: XML displayed in the Monaco viewer was indenting progressively further right. Rewrote the `formatXML` function with a proper tokenizer that splits XML into tags and text nodes, merges `<tag>text</tag>` patterns into single inline elements, and correctly tracks indent for opening, closing, and self-closing tags.
33. Style toolbar buttons with a consistent, polished design system. Added CSS variables for button variants (default, primary, danger, ghost) with proper hover and active states. Rewrote `toolbar.scss` with shared mixins for button styling. Deploy Process uses primary (purple) style, Clear Diagram uses danger (red) style, icon-only buttons (print, undo/redo) use ghost style, and all other buttons use default style. Added focus-visible outlines and smooth transitions. Overrode the generic widget hover for toolbar-scoped buttons.
34. Fix Deploy Process button hover specificity: the `widgets.scss` generic hover rule (with a long `:not()` chain) had higher specificity than toolbar button hover styles, causing the Deploy button to turn white on hover. Removed the blanket `unset` reset approach and instead baked the same `:not()` specificity chain into every button mixin via an SCSS `$hover-specificity-boost` variable interpolated into each `&:hover` selector, so all toolbar button variants cleanly win over `widgets.scss`.
35. Replace all native `alert()` and `confirm()` calls with styled JointJS `ui.Dialog` notifications. Created `showNotification(variant, title, message)` helper supporting success/error/info/warning variants with colored icons, title-bar accent borders, and styled action buttons. Created `showConfirmation(title, message)` returning a Promise for the Clear Diagram confirm flow. Added `notification-dialog.scss` with full dialog styling including backdrop, card layout, variant-specific colors, and button hover states matching the toolbar design system.
36. Fetch deployed processes from Camunda on-demand when the Load Process or Start Process dropdown is clicked, instead of eagerly on page load and after a 1-second delay post-deploy. Removed the initial `loadDeployedProcesses()` call from the constructor and the delayed reload after deploy. Both dropdown click handlers now `await loadDeployedProcesses()` before showing the process list, so the user always sees the freshest data and can retry by clicking again.
37. Fix Camunda deploy error: "Invalid content was found starting with element 'serviceTask'" — BPMN 2.0 XML schema requires strict child element ordering within `<process>`: flow elements first, then sequenceFlow, then artifacts. Added a reordering step at the end of `processXMLWithZeebeExtensions()` that sorts process children into the correct schema order before serialization.
38. Fix "Load BPMN XML" (local file import) losing all Zeebe extensions. The local import path was calling `XMLFileImporter.import()` directly without extracting or restoring extensions. Added the same three-step process used by "Load Process" from Camunda: (1) `extractZeebeExtensions()` before import, (2) `markHttpConnectorsInXML()` to set correct element types, (3) `restoreZeebeExtensions()` after import to restore properties to the inspector panel.
39. Add configurable timeout parameters to HTTP Connector inspector panel: Connection Timeout (default: 20s), Read Timeout (default: 20s), and Write Timeout (default: 0s). Previously connection and read timeouts were hardcoded to 20 seconds. Timeouts are stored in `httpConfig`, exported as `zeebe:input` elements (`connectionTimeoutInSeconds`, `readTimeoutInSeconds`, `writeTimeoutInSeconds`) within `zeebe:ioMapping`, and restored during import. Setting 0 means no timeout.
40. Add "Input Mapping" section to Service Task and HTTP Connector inspector panels. The section includes a list widget with "Source Expression" (FEEL) and "Target Variable" text fields. Input mappings are exported as `zeebe:input` elements within `zeebe:ioMapping` in the BPMN XML, with source expressions automatically prefixed with "=" on export and stripped on import. For HTTP Connectors, user-defined input mappings are distinguished from built-in connector inputs (method, url, headers, body, timeouts, etc.) during import by filtering known target names. Also added `inputMappings: []` default and `getInputMappingConfig()` static helper to the Activity base class, and updated the generic `addIOMappingsToElement()` helper to handle both input and output mappings for all element types.
