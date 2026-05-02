import { JobType } from '../enums/JobType';

export class Prompt {
  constructor(
    public readonly id: string,
    public readonly jobType: JobType,
    public readonly template: string,
    public readonly version: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static fromDb(row: Record<string, unknown>): Prompt {
    return new Prompt(
      row.id as string,
      row.job_type as JobType,
      row.template as string,
      row.version as number,
      new Date(row.created_at as string),
      new Date(row.updated_at as string),
    );
  }

  /**
   * Render the prompt template with the provided variables
   * @param variables Object containing variables to replace in the template
   * @returns Rendered prompt string
   */
  public render(variables: Record<string, string>): string {
    let rendered = this.template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }

    return rendered;
  }
}
