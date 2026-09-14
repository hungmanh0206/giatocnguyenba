import { AIProviderError, type AIProviderRequest, type AIProviderResponse } from '../types';
import type { AIProvider } from './ai-provider';

export class FallbackProvider implements AIProvider {
  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
  ) {}

  async generate(input: AIProviderRequest): Promise<AIProviderResponse> {
    try {
      return await this.primary.generate(input);
    } catch (error) {
      if (
        !(error instanceof AIProviderError) ||
        !['configuration', 'quota', 'unavailable'].includes(error.code)
      ) {
        throw error;
      }
      console.warn('[ai] Primary provider unavailable; switching provider');
      return this.fallback.generate(input);
    }
  }
}
