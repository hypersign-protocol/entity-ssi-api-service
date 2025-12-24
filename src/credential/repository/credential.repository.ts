import { Inject, Injectable, Logger } from '@nestjs/common';
import { Credential, CredentialModel } from '../schemas/credntial.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

@Injectable()
export class CredentialRepository {
  constructor(
    @Inject('CREDENTIAL_MODEL')
    private readonly credentialModel: Model<CredentialModel>,
  ) {}

  async findOne(
    credentialFilterQuery: FilterQuery<Credential>,
  ): Promise<CredentialModel> {
    Logger.log(
      'findOne() method: starts, finding particular credential from db',
      'CredentialRepository',
    );
    return this.credentialModel.findOne(credentialFilterQuery);
  }
  async find(
    credentialFilterQuery: FilterQuery<Credential>,
  ): Promise<Credential[]> {
    Logger.log(
      'find() method: starts, finding list of credentials from db',
      'CredentialRepository',
    );
    const match = { appId: credentialFilterQuery.appId };
    if (credentialFilterQuery.paginationOption.issuerDid) {
      match['issuerDid'] = credentialFilterQuery.paginationOption.issuerDid;
    }
    return await this.credentialModel.aggregate([
      { $match: match },
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: credentialFilterQuery.paginationOption.skip },
            { $limit: credentialFilterQuery.paginationOption.limit },
            {
              $project: { credentialId: 1, _id: 0, createdAt: 1 },
            },
          ],
        },
      },
    ]);
  }

  async create(credential: Credential): Promise<CredentialModel> {
    Logger.log(
      'create() method: starts, adding credential to db',
      'CredentialRepository',
    );
    const newCredential = new this.credentialModel(credential);
    return newCredential.save();
  }

  async findOneAndUpdate(
    credentialFilterQuery: FilterQuery<CredentialModel>,
    credential: Partial<CredentialModel>,
  ): Promise<CredentialModel> {
    Logger.log(
      'findOneAndUpdate() method: starts, updating credential to db',
      'CredentialRepository',
    );
    return this.credentialModel.findOneAndUpdate(
      credentialFilterQuery,
      credential,
      { new: true },
    );
  }
}
