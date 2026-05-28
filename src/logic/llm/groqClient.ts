import Groq from 'groq-sdk';
import type {
  LLMClient,
  LLMResponse,
  ToolDefinition,
  ConversationMessage,
  ToolCall,
} from './types';

type GroqMessage = Groq.Chat.ChatCompletionMessageParam;

function toGroqMessages(messages: ConversationMessage[]): GroqMessage[] {
  const result: GroqMessage[] = [];

  for (const msg of messages) {
    if ('content' in msg) {
      result.push({ role: msg.role, content: msg.content });
    } else if ('toolCalls' in msg) {
      // Assistant turn that ended with tool calls — replay raw content
      result.push(msg.rawContent as Groq.Chat.ChatCompletionAssistantMessageParam);
    } else if ('toolResults' in msg) {
      // One tool message per result (Groq / OpenAI format)
      for (const r of msg.toolResults) {
        result.push({
          role: 'tool',
          tool_call_id: r.tool_use_id,
          content: r.content,
        });
      }
    }
  }

  return result;
}

function toGroqTools(tools: ToolDefinition[]): Groq.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

export class GroqLLMClient implements LLMClient {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async chat(
    systemPrompt: string,
    messages: ConversationMessage[],
    tools: ToolDefinition[],
  ): Promise<LLMResponse> {
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...toGroqMessages(messages),
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      tools: toGroqTools(tools),
      tool_choice: 'auto',
      messages: groqMessages,
    });

    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    const stopReason =
      choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn';

    return {
      stopReason,
      toolCalls,
      text: message.content ?? '',
      rawContent: message,
    };
  }
}
