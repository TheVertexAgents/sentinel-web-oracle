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
  private primaryClient: Anthropic | null = null;
  private fallbackClient: Anthropic | null = null;
  private model: string;

  constructor(model: string, anthropicKey?: string, aimlKey?: string) {
    this.model = model;
    if (anthropicKey) {
      this.primaryClient = new Anthropic({ apiKey: anthropicKey });
    }
    if (aimlKey) {
      this.fallbackClient = new Anthropic({
        apiKey: aimlKey,
        baseURL: 'https://api.aimlapi.com',
      });
    }

    if (!this.primaryClient && !this.fallbackClient) {
      throw new Error('Either ANTHROPIC_API_KEY or AIML_API_KEY must be provided.');
    }
  }

  async chat(
    systemPrompt: string,
    messages: ConversationMessage[],
    tools: ToolDefinition[],
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;

    // 1. Try standard Anthropic first (Hackathon judging preference)
    if (this.primaryClient) {
      try {
        console.log(`[LLM/Anthropic] Attempting request via standard Anthropic API...`);
        return await this.executeChat(this.primaryClient, systemPrompt, messages, tools);
      } catch (err: any) {
        lastError = err;
        console.warn(`[LLM/Anthropic] Standard API failed: ${err.message}`);
        if (!this.fallbackClient) throw err;
      }
    }

    // 2. Fallback to AI/ML API (User preference/backup)
    if (this.fallbackClient) {
      try {
        console.log(`[LLM/Anthropic] Falling back to AI/ML API...`);
        return await this.executeChat(this.fallbackClient, systemPrompt, messages, tools);
      } catch (err: any) {
        console.error(`[LLM/Anthropic] AI/ML API fallback failed: ${err.message}`);
        throw lastError || err;
      }
    }

    throw lastError || new Error('No LLM clients available');
  }

  private async executeChat(
    client: Anthropic,
    systemPrompt: string,
    messages: ConversationMessage[],
    tools: ToolDefinition[],
  ): Promise<LLMResponse> {
    const response = await client.messages.create({
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
