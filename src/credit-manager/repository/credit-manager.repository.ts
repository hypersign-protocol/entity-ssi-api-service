import { Inject } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import {
  CreditManager,
  CreditManagerType,
} from '../schema/credit-manager.schema';
export class CreditManagerRepository {
  constructor(
    @Inject('CREDIT_STORE_MODEL')
    private readonly creditConnection: Model<CreditManagerType>,
  ) {}
  async saveCreditDetail(creditDetail: CreditManager): Promise<CreditManager> {
    const newCreditDetail = new this.creditConnection(creditDetail);
    return newCreditDetail.save();
  }

  async findCreditDetailList(
    creditFilterQuery: FilterQuery<CreditManager>,
  ): Promise<CreditManager[]> {
    return this.creditConnection.find(creditFilterQuery);
  }

  async findParticularCreditDetail(
    creditFilterQuery: FilterQuery<CreditManager>,
  ): Promise<CreditManager> {
    return this.creditConnection.findOne(creditFilterQuery);
  }

  async updateCreditDetail(
    creditFilterQuery: FilterQuery<CreditManager>,
    creditDetail,
  ): Promise<CreditManager> {
    return this.creditConnection.findOneAndUpdate(
      creditFilterQuery,
      creditDetail,
      { new: true },
    );
  }

  async findBasedOnAggregationPipeline(pipeline): Promise<any[]> {
    return this.creditConnection.aggregate(pipeline);
  }
}
