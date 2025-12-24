import { Injectable, Logger } from '@nestjs/common';
import { LogRepository } from '../repository/log.repository';
import { CreateLogDto } from '../dto/create-log.dto';
import { CreditManagerService } from 'src/credit-manager/managers/credit-manager.service';

@Injectable()
export class LogService {
  constructor(
    private readonly logRepo: LogRepository,
    private readonly creditManagerService: CreditManagerService,
  ) {}
  async createLog(log: any) {
    Logger.log(
      `Storing log to db:  ${log.method} ${log.path} ${log.statusCode} ${log.contentLenght} ${log.userAgent} ${log.appId}`,
      'LogService',
    );

    return this.logRepo.create(log);
  }

  async findLogByAppId(appId: string): Promise<CreateLogDto[]> {
    Logger.log(
      `Finding log by appId : 
    ${appId}
    `,
      'LogService',
    );
    return await this.logRepo.findByAppId(appId);
  }

  async findLogBetweenDates(
    startDate: Date,
    endDate: Date,
    appId: string,
  ): Promise<CreateLogDto[]> {
    Logger.log(
      `Finding log by appId : 
    ${appId}
    `,
      'LogService',
    );

    return await this.logRepo.findLogBetweenDates({
      startDate,
      endDate,
      appId,
    });
  }
  async findBetweenDatesAndAgreegateByPath(
    startDate: Date,
    endDate: Date,
    appId: string,
  ): Promise<any> {
    Logger.log(
      `Finding log by appId : 
    ${appId} and group by path
    `,
      'LogService',
    );
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          $nor: [
            { path: { $regex: 'usage' } },
            { path: { $regex: 'credit' } },
            { path: { $regex: 'presentation' } },
          ],
        },
      },
      {
        $project: {
          method: 1,
          normalizedPath: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: '$path',
                      regex: '^/api/v1/did/resolve/',
                    },
                  },
                  then: '/api/v1/did/resolve',
                },
                {
                  case: {
                    $regexMatch: {
                      input: '$path',
                      regex: '^/api/v1/schema/sch:',
                    },
                  },
                  then: '/api/v1/schema/resolve',
                },
                {
                  case: {
                    $regexMatch: {
                      input: '$path',
                      regex: '^/api/v1/credential/vc:',
                    },
                  },
                  then: '/api/v1/credential/resolve',
                },
              ],
              default: '$path', // If no match, keep the original path
            },
          },
        },
      },
      {
        $group: {
          _id: {
            path: '$normalizedPath',
            method: '$method',
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          apiPath: '$_id.path',
          method: '$_id.method',
          count: 1,
        },
      },
    ];

    const serviceDetails =
      await this.logRepo.findDataBasedOnAgggregationPipeline(pipeline);
    const updatedServiceDetails = await Promise.all(
      serviceDetails.map(async (x) => {
        x['apiPath'] = x['apiPath'];
        x['quantity'] = x['count'];
        x['unit_cost'] =
          await this.creditManagerService.getCreditDetailFromPath(
            x['method'],
            x['apiPath'],
          );
        (x['onchain_unit_cost'] = x['unit_cost']['hidCost']),
          (x['offchain_unit_cost'] = x['unit_cost']['creditAmountRequired']);
        x['onchainAmount'] = Number(
          (x['onchain_unit_cost'] * x['quantity']).toFixed(2),
        );
        x['offchainAmount'] = Number(
          (x['offchain_unit_cost'] * x['quantity']).toFixed(2),
        );
        delete x['count'];
        delete x['unit_cost'];
        return x;
      }),
    );

    return updatedServiceDetails;
  }
  async findDetailedLogBetweenDates(
    startDate: Date,
    endDate: Date,
    appId: string,
  ): Promise<any> {
    Logger.log(
      `Finding log by appId : 
    ${appId} and group by session path
    `,
      'LogService',
    );
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          path: { $exists: true, $ne: null },
          $nor: [
            { path: { $regex: 'usage' } },
            { path: { $regex: 'credit' } },
            { path: { $regex: 'presentation' } },
          ],
        },
      },
      {
        $project: {
          method: 1,
          createdAt: 1,
          path: { $ifNull: ['$path', 'unknown'] },
          normalizedPath: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: '$path',
                      regex: '^/api/v1/did/resolve/',
                    },
                  },
                  then: '/api/v1/did/resolve',
                },
                {
                  case: {
                    $regexMatch: {
                      input: '$path',
                      regex: '^/api/v1/schema/sch:',
                    },
                  },
                  then: '/api/v1/schema/resolve',
                },
                {
                  case: {
                    $regexMatch: {
                      input: '$path',
                      regex: '^/api/v1/credential/vc:',
                    },
                  },
                  then: '/api/v1/credential/resolve',
                },
              ],
              default: '$path',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            path: '$normalizedPath',
            date: {
              $ifNull: [
                { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                'unknown-date',
              ],
            },
          },

          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.path',
          data: {
            $push: {
              k: '$_id.date',
              v: '$count',
            },
          },
          quantity: { $sum: '$count' },
        },
      },
      {
        $project: {
          _id: 0,
          apiPath: '$_id',
          data: { $arrayToObject: '$data' },
          quantity: 1,
        },
      },
    ];
    return this.logRepo.findDataBasedOnAgggregationPipeline(pipeline);
  }
}
