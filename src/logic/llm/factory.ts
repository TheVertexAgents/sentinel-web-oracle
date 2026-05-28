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
    const isAiml = !!config.llm.aimlKey;
    const apiKey = isAiml ? config.llm.aimlKey : config.llm.anthropicKey;
    const baseURL = isAiml ? 'https://api.aimlapi.com' : undefined;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY or AIML_API_KEY is required when AI_PROVIDER=anthropic',
      );
    }

    return new AnthropicLLMClient(apiKey, config.llm.model, baseURL);
  }

  // Default: groq
  if (!config.llm.groqKey) {
    throw new Error('GROQ_API_KEY is required when AI_PROVIDER=groq');
  }
  return new GroqLLMClient(config.llm.groqKey, config.llm.model);
}
