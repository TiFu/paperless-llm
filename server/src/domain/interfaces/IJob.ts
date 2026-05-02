import { IDocument } from './IDocument';
import { ILLMService } from './ILLMService';
import { Prompt } from '../entities/Prompt';
import { Action } from '../actions/Action';

export interface IJob {
  /**
   * Execute the job for a given document
   * @param document The document to process
   * @param llmService Service for calling the LLM
   * @param prompt The prompt template to use
   * @returns Action to be inserted into the document update queue
   */
  execute(
    document: IDocument,
    llmService: ILLMService,
    prompt: Prompt,
  ): Promise<Action>;
}
