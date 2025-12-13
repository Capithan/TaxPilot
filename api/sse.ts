export const config = {
  runtime: 'edge',
};

function makeStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // Initial ready event
      controller.enqueue(encoder.encode(`event: ready\n`));
      controller.enqueue(encoder.encode(`data: {"service":"tax-intake-mcp-bridge-vercel-edge"}\n\n`));

      // Heartbeat pings
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\n`));
        controller.enqueue(encoder.encode(`data: {"ts": ${Date.now()}}\n\n`));
      }, 25000);

      // Close handler via global abort (handled in fetch below)
      (globalThis as any)._sse_interval = interval;
    },
    cancel() {
      const interval = (globalThis as any)._sse_interval;
      if (interval) clearInterval(interval);
    },
  });

  return stream;
}

export default async function handler(req: Request) {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const stream = makeStream();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // CORS for ChatGPT
      'Access-Control-Allow-Origin': '*',
    },
  });
}
