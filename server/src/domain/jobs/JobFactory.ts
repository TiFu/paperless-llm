import { IJob } from '../interfaces/IJob';
import { JobType } from '../enums/JobType';
import { TitleJob } from './TitleJob';

export class JobFactory {
  /**
   * Create a job instance based on job type
   * @param jobType The type of job to create
   * @returns Job instance implementing IJob interface
   * @throws Error if job type is not supported
   */
  static create(jobType: JobType): IJob {
    switch (jobType) {
      case JobType.TITLE:
        return new TitleJob();
      case JobType.TAG:
        throw new Error('TagJob not implemented yet');
      case JobType.SUMMARY:
        throw new Error('SummaryJob not implemented yet');
      default:
        throw new Error(`Unsupported job type: ${jobType}`);
    }
  }
}
