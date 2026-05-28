/**
 * Shared LLM abstraction types.
 * Both the Anthropic and Groq adapters implement LLMClient so agentLoop.ts
 * never imports a provider SDK directly.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
}

/** A single turn in the conversation. */
export type MessageRole = 'user' | 'assistant';

export interface TextMessage {
  role: MessageRole;
  content: string;
}

export interface ToolUseMessage {
  role: 'assistant';
  toolCalls: ToolCall[];
  rawContent: unknown; // provider-specific, passed back verbatim for multi-turn
}

export interface ToolResultMessage {
  role: 'user';
  toolResults: ToolResult[];
}

export type ConversationMessage = TextMessage | ToolUseMessage | ToolResultMessage;

/** What the LLM client returns after each call. */
export interface LLMResponse {
  stopReason: 'tool_use' | 'end_turn' | string;
  toolCalls: ToolCall[];       // empty when stopReason !== 'tool_use'
  text: string;                // final text (may be empty mid-loop)
  rawContent: unknown;         // passed back verbatim for multi-turn continuations
}

/** The interface every provider adapter must implement. */
export interface LLMClient {
  chat(
    systemPrompt: string,
    messages: ConversationMessage[],
    tools: ToolDefinition[],
  ): Promise<LLMResponse>;
}
