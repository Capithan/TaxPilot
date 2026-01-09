import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { ServerResponse } from 'http';
export declare const transports: Record<string, SSEServerTransport>;
export declare function createMcpServer(): Server;
export declare function createSseTransport(endpoint: string, res: ServerResponse): SSEServerTransport;
//# sourceMappingURL=mcp-sse.d.ts.map