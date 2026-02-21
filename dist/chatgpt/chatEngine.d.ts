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
 */
export declare function chat(chatId: string, userMessage: string, options?: {
    model?: string;
}): Promise<{
    reply: string;
    chatId: string;
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