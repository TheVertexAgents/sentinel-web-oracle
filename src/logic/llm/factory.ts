import { config } from '../../config/zones';
import { AnthropicLLMClient } from './anthropicClient';
import { GroqLLMClient } from './groqClient';
import type { LLMClient } from './types';

/**
 * Returns the correct LLM client based on AI_PROVIDER env var.
 * Defaults to Groq when AI_PROVIDER is unset or unrecognised.
 */
export function getLLMClient(): LLMClient {
  const provider = config.llm.provider;

  if (provider === 'anthropic') {
    return new AnthropicLLMClient(
      config.llm.model,
      config.llm.anthropicKey,
      config.llm.aimlKey,
    );
  }

  // Default: groq
  if (!config.llm.groqKey) {
    throw new Error('GROQ_API_KEY is required when AI_PROVIDER=groq');
  }
  return new GroqLLMClient(config.llm.groqKey, config.llm.model);
}
