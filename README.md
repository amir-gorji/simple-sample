# ATXP monetized MCP server for Vercel

A very simple HTTP MCP server that uses [ATXP](https://atxp.ai) to require payment before each tool call. Built for [Vercel](https://vercel.com) serverless functions.

## What it does

- Exposes two paid MCP tools: `upcase` and `hello`.
- Charges **0.01 USDC** per call via ATXP.
- Uses the MCP **Streamable HTTP** transport on a single `/mcp` endpoint.
- Stateless request handling so it works cleanly on Vercel.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and add your ATXP connection string:

   ```bash
   cp .env.example .env
   ```

   Get your connection string from [https://accounts.atxp.ai/](https://accounts.atxp.ai/) after creating an account. It looks like:

   ```
   https://accounts.atxp.ai?connection_token=...
   ```

3. Run locally:

   ```bash
   npm run dev
   ```

   The server will be available at `http://localhost:3000` and the MCP endpoint at `http://localhost:3000/mcp`.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Add the `ATXP_CONNECTION` environment variable in the Vercel dashboard.
4. Deploy.

After deploy, your MCP URL will be `https://<your-project>.vercel.app/mcp`.

## Connect an MCP client

Use the deployed URL as a **Streamable HTTP** MCP server endpoint. The first time a paid tool is called, the client will be prompted to authorize an ATXP wallet and complete the payment.

## Project structure

- `api/index.ts` — the Vercel serverless function / Express MCP server.
- `api/dev.ts` — local development HTTP server.
- `vercel.json` — routes all traffic to `api/index.ts`.
- `.env.example` — example environment variables.
