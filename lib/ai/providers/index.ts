import 'server-only';

import { AIProviderError } from '../types';
import type { AIProvider } from './ai-provider';
import { GeminiProvider } from './gemini-provider';
import { MockProvider } from './mock-provider';

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLocaleLowerCase()
    || (process.env.GEMINI_API_KEY ? 'gemini' : 'mock');
  if (provider === 'mock') return new MockProvider();
  if (provider !== 'gemini') throw new AIProviderError('configuration');

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || 'gemini-3.8-flash';
  if (!apiKey) throw new AIProviderError('configuration');
  return new GeminiProvider(apiKey, model);
}
