import { Injectable } from '@nestjs/common';
import { TxnStatusRepository } from './repository/status.repository';
import { RegistrationStatusList } from './dto/registration-status.response.dto';

@Injectable()
export class StatusService {
  constructor(private readonly txnStatusRepository: TxnStatusRepository) {}
  findBySsiId(id: string, option?): Promise<RegistrationStatusList> {
    if (!option) {
      option = {
        page: 1,
        limit: 10,
      };
    }
    const skip = (option.page - 1) * option.limit;
    option['skip'] = skip;
    return this.txnStatusRepository.find(
      {
        id,
      },
      {},
      option,
    );
  }

  findByTxnId(id: string, option): Promise<RegistrationStatusList> {
    const skip = (option.page - 1) * option.limit;
    option['skip'] = skip;
    return this.txnStatusRepository.find(
      {
        txnHash: id,
      },
      {},
      {
        skip: option.skip,
        limit: option.limit,
      },
    );
  }
}
