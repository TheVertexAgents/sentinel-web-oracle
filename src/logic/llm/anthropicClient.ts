import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMClient,
  LLMResponse,
  ToolDefinition,
  ConversationMessage,
  ToolCall,
} from './types';

function toAnthropicMessages(
  messages: ConversationMessage[],
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if ('content' in msg) {
      // Plain text message
      result.push({ role: msg.role, content: msg.content });
    } else if ('toolCalls' in msg) {
      // Assistant turn that ended with tool_use — replay raw content
      result.push({
        role: 'assistant',
        content: msg.rawContent as Anthropic.ContentBlock[],
      });
    } else if ('toolResults' in msg) {
      // User turn supplying tool results
      result.push({
        role: 'user',
        content: msg.toolResults.map((r) => ({
          type: 'tool_result' as const,
          tool_use_id: r.tool_use_id,
          content: r.content,
        })),
      });
    }
  }

  return result;
}

export class AnthropicLLMClient implements LLMClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(
    systemPrompt: string,
    messages: ConversationMessage[],
    tools: ToolDefinition[],
  ): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages: toAnthropicMessages(messages),
    });

    const toolCalls: ToolCall[] = response.content
      .filter((b) => b.type === 'tool_use')
      .map((b) => {
        const block = b as Anthropic.ToolUseBlock;
        return {
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
      });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');

    return {
      stopReason: response.stop_reason ?? 'end_turn',
      toolCalls,
      text,
      rawContent: response.content,
    };
  }
}
