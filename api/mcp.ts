import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { atxpExpress, requirePayment, ATXPAccount } from "@atxp/express";
import BigNumber from "bignumber.js";
import { z } from "zod";

const app = express();
app.use(express.json());

// Read your ATXP connection string from the environment.
// Get one from https://accounts.atxp.ai/ after creating an account.
const ATXP_CONNECTION = process.env.ATXP_CONNECTION;
if (!ATXP_CONNECTION) {
  throw new Error(
    "Missing ATXP_CONNECTION environment variable. Set it to your ATXP connection string."
  );
}

// Add ATXP payment middleware. It handles OAuth/payment callbacks and sets up
// the request context that requirePayment uses.
app.use(
  atxpExpress({
    destination: new ATXPAccount(ATXP_CONNECTION),
    payeeName: "ATXP Vercel MCP Demo",
    mountPath: "/mcp",
  })
);

// Factory so each HTTP request gets its own MCP server + transport.
// This keeps the server stateless, which is the simplest fit for Vercel.
function createMcpServer() {
  const mcp = new McpServer({
    name: "atxp-vercel-mcp-demo",
    version: "1.0.0",
  });

  // A simple paid tool that converts text to uppercase.
  mcp.tool(
    "upcase",
    "Convert the provided text to uppercase. Costs 0.01 USDC per call.",
    {
      text: z.string().describe("The text to convert to uppercase"),
    },
    async ({ text }) => {
      // Require payment before executing the tool logic.
      await requirePayment({ price: BigNumber(0.01) });

      return {
        content: [
          {
            type: "text",
            text: text.toUpperCase(),
          },
        ],
      };
    }
  );

  // A simple paid greeting tool.
  mcp.tool(
    "hello",
    "Return a personalized greeting. Costs 0.01 USDC per call.",
    {
      name: z.string().optional().describe("Name to greet"),
    },
    async ({ name }) => {
      await requirePayment({ price: BigNumber(0.01) });

      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name ?? "World"}!`,
          },
        ],
      };
    }
  );

  return mcp;
}

// Route all MCP traffic to a fresh Streamable HTTP transport.
app.all("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  transport.onerror = (err) => {
    console.error("MCP transport error:", err);
  };

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  } finally {
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
  }
});

// A friendly health-check page.
app.get("/", (_req, res) => {
  res.send("ATXP monetized MCP server is running.");
});

// Log unexpected errors during development.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default app;

