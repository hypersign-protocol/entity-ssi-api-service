import { Injectable, Logger } from '@nestjs/common';
import { QueueFactory } from './queue.factory';
@Injectable()
export class MailClientService {
  serverName = 'HYPERSIGN_API_SERVICE';
  private readonly defaultQueueName =
    process.env.DASHBOARD_NOTIFICATION_QUEUE ||
    'Credit-Usage-Notification-Queue';
  private readonly defaultJobName = 'credit-usage-notification';
  constructor(private readonly queueFactory: QueueFactory) {}
  async addJobsInBulk(
    jobs: { to: string; subject: string; message: any }[],
    queueName?: string,
    jobName?: string,
  ) {
    try {
      Logger.debug('Inside addJobsInBulk function.....');
      const finalQueueName =
        queueName || this.defaultQueueName || 'Credit-Usage-Notification-Queue';
      const finalJobName = jobName || this.defaultJobName;
      const myQueue = this.queueFactory.getQueue(finalQueueName);
      const bulkJobs = jobs.map((job) => {
        if (job.to && job.subject && job.message) {
          return {
            name: finalJobName,
            data: {
              serverName: this.serverName,
              to: job.to,
              subject: job.subject,
              message: job.message,
            },
          };
        }
      });
      await myQueue.addBulk(bulkJobs);
      Logger.debug('all jobs are added in the queue');
    } catch (e) {
      Logger.error(e);
    }
  }

  async addAJob<T>(job: T, queueName?: string, jobName?: string) {
    try {
      Logger.debug('Inside addAJob function.....');
      const finalQueueName = queueName || this.defaultQueueName;
      Logger.debug(`finalQueueName: ${finalQueueName}`, 'MailClientService');
      const finalJobName = jobName || this.defaultJobName;
      const queue = this.queueFactory.getQueue(finalQueueName);
      await queue.add(finalJobName, { ...job, serverName: this.serverName });
      Logger.debug('A job is added in the queue');
    } catch (e) {
      Logger.log(e);
    }
  }
}
