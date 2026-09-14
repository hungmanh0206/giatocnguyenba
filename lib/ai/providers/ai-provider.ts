import type { AIProviderRequest, AIProviderResponse } from '../types.ts';

export interface AIProvider {
  generate(input: AIProviderRequest): Promise<AIProviderResponse>;
}
