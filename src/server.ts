import "./lib/error-capture";
import { createServer } from "node:http";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const swallowedError = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error('[server swallowed error]', swallowedError);
  
  const msg = swallowedError instanceof Error ? swallowedError.message : String(swallowedError);
  const stack = swallowedError instanceof Error ? swallowedError.stack ?? '' : '';

  return new Response(renderErrorPage(msg, stack), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const handler = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const serverEntry = await getServerEntry();
      const response = await serverEntry.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack ?? '' : '';
      console.error('[server handler]', msg, stack);
      return new Response(renderErrorPage(msg, stack), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

// Start a real HTTP server in production environments (like Hostinger)
// Start unless we are explicitly in local dev mode
if (process.env.NODE_ENV !== "development") {
  const PORT = Number(process.env.PORT ?? 3000);
  const HOST = process.env.HOST ?? "0.0.0.0";

  const server = createServer(async (nodeReq, nodeRes) => {
    try {
      const protocol = "http";
      const host = nodeReq.headers.host ?? `${HOST}:${PORT}`;
      const url = `${protocol}://${host}${nodeReq.url ?? "/"}`;

      let body: Buffer | null = null;
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

      const response = await handler.fetch(request, {}, {});

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
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack ?? '' : '';
      console.error('[node handler]', msg, stack);
      const html = renderErrorPage(msg, stack);
      nodeRes.writeHead(500, { "content-type": "text/html; charset=utf-8" });
      nodeRes.end(html);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

export default handler;
