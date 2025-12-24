import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { RegistrationStatusDocument } from '../schema/status.schema';
import { skip } from 'rxjs';
import { RegistrationStatusList } from '../dto/registration-status.response.dto';

@Injectable()
export class TxnStatusRepository {
  constructor(
    @Inject('STATUS_MODEL')
    private readonly registatiationStatusModel: Model<RegistrationStatusDocument>,
  ) {}

  async find(
    registrationStatus: FilterQuery<RegistrationStatusDocument>,
    projection?: ProjectionType<RegistrationStatusDocument>,
    option?: QueryOptions<RegistrationStatusDocument>,
  ): Promise<any> {
    return this.registatiationStatusModel.aggregate([
      { $match: { ...registrationStatus } }, // Apply the query filter
      {
        $facet: {
          totalCount: [{ $count: 'total' }],

          data: [
            { $project: { _id: 0 } },
            { $skip: Number(option.skip) }, // Apply the skip (pagination)
            { $limit: Number(option.limit) }, // Apply the limit (pagination)
          ],
        },
      },
    ]);
  }
}
