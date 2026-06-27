import { IDocument } from "../document/IDocument.js";
import { Job } from "../job/Job.js";


export interface IPromptService {

    renderPrompt(document: IDocument, job: Job): Promise<string>;
}