import { IDocument } from "../document/IDocument";
import { Job } from "../job/Job";
import { Prompt } from "./Prompt";


export interface IPromptService {

    renderPrompt(document: IDocument, job: Job): Promise<string>;
}