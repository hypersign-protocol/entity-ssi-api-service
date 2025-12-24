import { Inject, Logger } from '@nestjs/common';
import { Log, LogDoc } from '../schema/log.schema';
import { FilterQuery, Model } from 'mongoose';

export class LogRepository {
  constructor(@Inject('LOG_MODEL') private logModel: Model<LogDoc>) {}
  async create(log: Log): Promise<Log> {
    Logger.log(
      'Inside create() of LogRepository to add logger of each api call',
      'LogRepository',
    );
    const newLog = new this.logModel(log);
    return newLog.save();
  }
  async findByAppId(appId: string): Promise<LogDoc[]> {
    return this.logModel.find({ appId });
  }

  async findLogBetweenDates(filterQuery: FilterQuery<LogDoc>): Promise<Log[]> {
    return this.logModel.find(filterQuery);
  }
  async findDataBasedOnAgggregationPipeline(pipeine) {
    return this.logModel.aggregate(pipeine);
  }
}
