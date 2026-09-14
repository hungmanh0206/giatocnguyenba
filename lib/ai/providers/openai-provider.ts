import 'server-only';

import { AIProviderError, type AIProviderRequest, type AIProviderResponse } from '../types';
import type { AIProvider } from './ai-provider';

// The shared interface makes a future provider switch possible without touching UI.
export class OpenAIProvider implements AIProvider {
  async generate(_input: AIProviderRequest): Promise<AIProviderResponse> {
    throw new AIProviderError('configuration');
  }
}
