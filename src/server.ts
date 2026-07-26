import "./lib/error-capture";

import { createServer } from "node:http";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

type ServerEntry = {
  fetch: (request: Request) => Promise<Response> | Response;
};

let handlerCache: ServerEntry | undefined;

async function getHandler(): Promise<ServerEntry> {
  if (!handlerCache) {
    const m = await import("@tanstack/react-start/server-entry");
    handlerCache = (m.default ?? m) as ServerEntry;
  }
  return handlerCache;
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const server = createServer(async (nodeReq, nodeRes) => {
  try {
    const protocol = "http";
    const host = nodeReq.headers.host ?? `${HOST}:${PORT}`;
    const url = `${protocol}://${host}${nodeReq.url ?? "/"}`;

    // Read body for non-GET/HEAD requests
    let body: BodyInit | null = null;
    if (nodeReq.method !== "GET" && nodeReq.method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of nodeReq) {
        chunks.push(chunk as Buffer);
      }
      body = Buffer.concat(chunks);
    }

    const request = new Request(url, {
      method: nodeReq.method ?? "GET",
      headers: nodeReq.headers as HeadersInit,
      body,
    });

    const handler = await getHandler();
    let response = await handler.fetch(request);
    response = await normalizeCatastrophicSsrResponse(response);

    nodeRes.writeHead(response.status, Object.fromEntries(response.headers.entries()));

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        nodeRes.write(value);
      }
    }
    nodeRes.end();
  } catch (error) {
    console.error(error);
    const html = renderErrorPage();
    nodeRes.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    nodeRes.end(html);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

export default server;

