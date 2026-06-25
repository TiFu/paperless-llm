import axios, { AxiosInstance } from 'axios';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { LLMConfig } from '../config/AppConfig.js';
import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';

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
  private readonly logger: pino.Logger;
  private readonly client: AxiosInstance;
  private readonly model: string;
  private readonly temperature: number;

  constructor(config: LLMConfig) {
    this.logger = createChildLogger({ name: "OllamaService"})
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

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get<any>("/", {});
      this.logger.info({ service: "llm", status: true}, "Ollama health check")
      return true;
    } catch (error) {
      this.logger.info({ service: "llm", status: false}, "Ollama health check")
      return false
    }
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

    this.logger.info({ request: request, client: this.client}, "Request")
    try {
      const response = await this.client.post<OllamaChatResponse>('/api/generate', request);
      this.logger.info({ response: response}, "Ollama response")

      if (!response.data.response) {
        throw new Error('Empty response from Ollama');
      }

      return response.data.response.trim();
    } catch (error) {
      this.logger.info({ error: error}, "Ollama request failed")
      if (axios.isAxiosError(error)) {
        throw new Error(`Ollama API error: ${error.message}: ${error.response?.data}`);
      }
      throw error;
    }
  }

}
