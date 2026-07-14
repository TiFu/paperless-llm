import axios, { AxiosInstance } from 'axios';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { ILLMConfig } from '../config/AppConfig.js';
import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import { LogArea } from '../utils/LogArea.js';

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

  constructor(private readonly config: ILLMConfig) {
    this.logger = createChildLogger(LogArea.LLM, "OllamaService");

    this.client = axios.create({
      baseURL: config.llm.url,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.get("/", {});
      this.logger.info({ service: "llm", status: true}, "Ollama health check")
      return true;
    } catch {
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
      model: this.config.getModel(),
      prompt,
      stream: false,
      options: {
        temperature: temperature ?? this.config.getTemperature(),
      },
    };

    this.logger.debug(
      { model: request.model, promptLength: prompt.length, prompt, temperature: request.options?.temperature },
      'Sending LLM request',
    );
    try {
      const response = await this.client.post<OllamaChatResponse>('/api/generate', request, {
        timeout: this.config.getTimeoutMs(),
      });
      this.logger.debug({ responseText: response.data.response, done: response.data.done }, 'Received LLM response');

      if (!response.data.response) {
        throw new Error('Empty response from Ollama');
      }

      return response.data.response.trim();
    } catch (error) {
      this.logger.warn({ error }, 'Ollama request failed');
      if (axios.isAxiosError(error)) {
        throw new Error(`Ollama API error: ${error.message}: ${error.response?.data}`, { cause: error });
      }
      throw error;
    }
  }

}
