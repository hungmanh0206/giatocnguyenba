import 'server-only';

import { AIProviderError } from '../types';
import type { AIProvider } from './ai-provider';
import { GeminiProvider } from './gemini-provider';
import { MockProvider } from './mock-provider';

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLocaleLowerCase() || 'mock';
  if (provider === 'mock') return new MockProvider();
  if (provider !== 'gemini') throw new AIProviderError('configuration');

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  if (!apiKey || !model) throw new AIProviderError('configuration');
  return new GeminiProvider(apiKey, model);
}
