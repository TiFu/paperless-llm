/**
 * Interface for LLM (Large Language Model) service
 * This interface belongs to the domain layer, allowing job implementations
 * to remain independent of concrete service implementations
 */
export interface ILLMService {
  /**
   * Send a chat request to the LLM
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature override for this request
   * @returns The LLM response text
   */
  sendChatRequest(prompt: string, temperature?: number): Promise<string>;
}
