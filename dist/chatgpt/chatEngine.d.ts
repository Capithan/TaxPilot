import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
export interface ChatSession {
    id: string;
    messages: ChatCompletionMessageParam[];
    clientId?: string;
    sessionId?: string;
}
/**
 * Create or retrieve a chat session.
 */
export declare function getOrCreateChatSession(chatId: string): ChatSession;
/**
 * Send a user message and get an AI response with automatic function calling.
 * The OpenAI SDK handles the conversation; tool calls are executed locally.
 * When tools produce structured UI (forms, cards, etc.), the UI JSON is
 * returned alongside the text reply so the frontend can render it directly.
 */
export declare function chat(chatId: string, userMessage: string, options?: {
    model?: string;
}): Promise<{
    reply: string;
    chatId: string;
    structuredUI?: Record<string, unknown>;
}>;
/**
 * Reset a chat session.
 */
export declare function resetChatSession(chatId: string): void;
/**
 * List active chat sessions (for admin/debug).
 */
export declare function listChatSessions(): string[];
//# sourceMappingURL=chatEngine.d.ts.map