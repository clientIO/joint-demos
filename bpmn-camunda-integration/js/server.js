import express from "express";
import multer from "multer";
import { ZBClient } from "@camunda8/zeebe";
import * as fs from 'fs';

const app = express();
app.use(express.json());

// Enable CORS for modeler running on port 8080
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

// Zeebe connection configuration needed when running Camunda full version.
const connectionConfig = {
  useTLS: false,
  oAuth: {
    url: "http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token",
    audience: "orchestration-api",
    clientId: "orchestration",
    clientSecret: "secret",
  }
};

// Zeebe gRPC client (job workers, etc.)
const zb = new ZBClient("localhost:26500", connectionConfig);

// Orchestration Cluster REST API (for query operations not available in gRPC)
const ORCH_REST_BASE = "http://localhost:8088/v2";
const OAUTH_URL = "http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token";

let cachedToken = null;
let tokenExpiry = null;

async function getOAuthToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: connectionConfig.oAuth.clientId,
    client_secret: connectionConfig.oAuth.clientSecret,
    audience: connectionConfig.oAuth.audience,
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth failed: ${res.status} ${res.statusText}: ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Set expiry to 90% of actual expiry to refresh before it expires
  tokenExpiry = Date.now() + (data.expires_in * 900);
  return cachedToken;
}

async function orchFetch(path, options = {}) {
  const token = await getOAuthToken();

  const res = await fetch(`${ORCH_REST_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

/**
 * Deploy BPMN via Zeebe client
 */
app.post("/api/deploy", upload.single("bpmn"), async (req, res) => {
  try {
    if (!req.file) throw new Error("Missing multipart file field: bpmn");

    const result = await zb.deployResource({
      name: req.file.originalname || "process.bpmn",
      process: req.file.buffer
    });
    console.log("Deployment result:", result);
    res.json(result);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Start an instance via Zeebe client
 */
app.post("/api/start", async (req, res) => {
  try {
    const {
      processDefinitionKey,
      bpmnProcessId,
      version = -1,
      variables = {},
    } = req.body;

    console.log("Start request:", { processDefinitionKey, bpmnProcessId, version, variables });

    if (!processDefinitionKey && !bpmnProcessId) {
      throw new Error("Provide either processDefinitionKey OR bpmnProcessId");
    }

    let result;
    if (bpmnProcessId) {
      console.log("Creating instance with bpmnProcessId:", bpmnProcessId, "version:", version);

      result = await zb.createProcessInstance({
        bpmnProcessId: bpmnProcessId,
        version: version,
        variables: variables,
      });
    } else if (processDefinitionKey) {
      console.log("Creating instance with processDefinitionKey:", processDefinitionKey);

      result = await zb.createProcessInstance({
        processDefinitionKey: processDefinitionKey,
        variables: variables,
      });
    } else {
      throw new Error("Must provide either bpmnProcessId or processDefinitionKey");
    }

    console.log("Process instance created:", result);
    res.json(result);
  } catch (e) {
    console.error("Error starting process:", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * List deployed processes via authenticated REST API
 */
app.get("/api/processes", async (req, res) => {
  try {
    const result = await orchFetch("/process-definitions/search", {
      method: "POST",
      body: JSON.stringify({
        page: { from: 0, limit: 100 },
        sort: [{ field: "version", order: "desc" }],
      }),
    });
    console.log("Loaded deployed processes:", result?.items.length);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get process definition XML via authenticated REST API
 */
app.get("/api/process-xml/:key", async (req, res) => {
  try {
    const key = req.params.key;
    console.log("Fetching BPMN XML for process definition key:", key);

    const token = await getOAuthToken();

    // Try the base endpoint first
    const response = await fetch(`${ORCH_REST_BASE}/process-definitions/${key}`, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${token}`,
        "accept": "application/json"
      },
    });

    console.log("Response status:", response.status);
    console.log("Response content-type:", response.headers.get("content-type"));

    if (!response.ok) {
      const text = await response.text();
      console.error("Error response:", text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();

    // Check if bpmnXml is in the response
    if (result.bpmnXml) {
      console.log("Found bpmnXml field, length:", result.bpmnXml.length);
      res.json({ bpmnXml: result.bpmnXml });
    } else {
      console.log("No bpmnXml field, trying /xml endpoint");

      // Try the /xml endpoint
      const xmlResponse = await fetch(`${ORCH_REST_BASE}/process-definitions/${key}/xml`, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
        },
      });

      if (!xmlResponse.ok) {
        throw new Error(`Failed to fetch XML: ${xmlResponse.status}`);
      }

      const contentType = xmlResponse.headers.get("content-type") || "";

      if (contentType.includes("json")) {
        const xmlResult = await xmlResponse.json();
        res.json({ bpmnXml: xmlResult.bpmnXml || xmlResult });
      } else {
        const xmlText = await xmlResponse.text();
        res.json({ bpmnXml: xmlText });
      }
    }
  } catch (e) {
    console.error("Error fetching process XML:", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get instance status via authenticated REST API
 * Query operations are not available in Zeebe gRPC client
 */
app.get("/api/status/:key", async (req, res) => {
  try {
    const key = req.params.key;

    const instance = await orchFetch(`/process-instances/${key}`); //  [oai_citation:6‡docs.camunda.io](https://docs.camunda.io/docs/apis-tools/orchestration-cluster-api-rest/specifications/get-process-instance/?utm_source=chatgpt.com)
    const stats = await orchFetch(
      `/process-instances/${key}/statistics/element-instances`
    ); //  [oai_citation:7‡docs.camunda.io](https://docs.camunda.io/docs/apis-tools/orchestration-cluster-api-rest/specifications/get-process-instance-statistics/?utm_source=chatgpt.com)

    res.json({ instance, stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * List process instances via authenticated REST API
 * Query operations are not available in Zeebe gRPC client
 */
app.get("/api/instances", async (req, res) => {
  try {
    const result = await orchFetch("/process-instances/search", {
      method: "POST",
      body: JSON.stringify({
        page: { from: 0, limit: 100 },
        sort: [{ field: "startDate", order: "desc" }],
      }),
    });
    console.log("Loaded process instances:", result?.items.length);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

zb.createWorker({
  taskType: "log.console",
  taskHandler: async (job) => {
    const input = job.variables; // variables from start/deploy
    console.log("Worker log.console got job", job.key, "vars:", input);
    return job.complete({
      variables: {
        ...input,
        handledBy: "node-worker",
        handledAt: new Date().toISOString(),
      },
    });
  },
});

zb.createWorker({
  taskType: "write.file",
  taskHandler: async (job) => {
    const input = job.variables; // variables from start/deploy
    console.log("Worker write.file got job", job.key);
    console.log("Writing file:", input.filename);
    fs.writeFileSync(input.filename, input.content, "utf-8");
    return job.complete({
      variables: {
        ...input,
        handledBy: "node-worker",
        handledAt: new Date().toISOString(),
      },
    });
  },
});

app.listen(3000, () => {
  console.log("Node middle-layer listening on http://localhost:3000");
  console.log("Deploy BPMN:  POST /api/deploy (multipart field: bpmn)");
  console.log("Processes:    GET  /api/processes");
  console.log("Process XML:  GET  /api/process-xml/:processDefinitionKey");
  console.log('Start:        POST /api/start {"bpmnProcessId":"jointjs_demo"}');
  console.log("Status:       GET  /api/status/:processInstanceKey");
  console.log("Instances:    GET  /api/instances");
});