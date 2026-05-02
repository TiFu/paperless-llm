import axios, { AxiosInstance } from 'axios';
import { ILLMService } from '../domain/interfaces/ILLMService';
import { LLMConfig } from '../config/AppConfig';

export interface OllamaChatRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    [key: string]: unknown;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export class OllamaService implements ILLMService {
  private readonly client: AxiosInstance;
  private readonly model: string;
  private readonly temperature: number;

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.temperature = config.temperature;

    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send a chat request to Ollama
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature override
   * @returns The LLM response text
   */
  async sendChatRequest(prompt: string, temperature?: number): Promise<string> {
    const request: OllamaChatRequest = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: temperature ?? this.temperature,
      },
    };

    try {
      const response = await this.client.post<OllamaChatResponse>('/api/generate', request);

      if (!response.data.response) {
        throw new Error('Empty response from Ollama');
      }

      return response.data.response.trim();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if Ollama service is available
   * @returns true if the service is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }
}
