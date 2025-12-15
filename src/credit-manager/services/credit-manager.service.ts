import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCreditManagerDto,
  CreditManagerRequestDto,
  ValidityPeriodUnit,
} from '../dto/create-credit-manager.dto';
import { CreditManagerRepository } from '../repository/credit-manager.repository';
import { Status } from '../schema/credit-manager.schema';

@Injectable()
export class CreditService {
  constructor(private readonly creditRepository: CreditManagerRepository) {}
  async addCreditDetail(
    body: CreditManagerRequestDto,
    createCreditManagerDto: CreateCreditManagerDto,
  ) {
    Logger.log('addCreditDetail() method starts....', 'CreditService');
    const ifActivePlanExists =
      await this.creditRepository.findParticularCreditDetail({
        status: Status.ACTIVE,
      });
    const status = ifActivePlanExists ? Status.INACTIVE : Status.ACTIVE;
    let expiryTime;
    const validityPeriodInDays = this.convertValidityDurationToDays(
      createCreditManagerDto.validityDuration,
      createCreditManagerDto.validityDurationUnit,
    );
    createCreditManagerDto.validityDuration = validityPeriodInDays;
    Logger.debug(`Credit status:${status}`);
    const grantDetail = body;
    if (status === 'Active') {
      expiryTime = this.calculateExpiryTime(
        createCreditManagerDto.validityDuration,
      );
      // TOOD need to validate if authz grant was given to that wallet addres on blockchain.
      grantDetail = body;
    }
    const newCreditDetail = {
      ...createCreditManagerDto,
      status: status,
      expiresAt: expiryTime,
      credit: grantDetail?.credit,
      creditScope: grantDetail?.creditScope,
    };
    return this.creditRepository.saveCreditDetail(newCreditDetail);
  }

  async activateCredit(creditId: string) {
    Logger.log('activateCredit() method starts....', 'CreditManagerService');

    let creditDocument;
    try {
      creditDocument = await this.creditRepository.findParticularCreditDetail({
        _id: creditId,
      });
    } catch (e) {
      if (e.name === 'CastError') {
        throw new BadRequestException(['Invalid credit Id']);
      } else {
        throw new BadRequestException([e.message]);
      }
    }
    if (!creditDocument) {
      throw new NotFoundException([
        `No credit detail found for creditId: ${creditId}`,
      ]);
    }
    await this.creditRepository.updateCreditDetail(
      { status: 'Active' },
      { $set: { status: 'Inactive' } },
    );

    Logger.log(
      `activateCredit() method::  activating credit for id ${creditId}`,
      'CreditManagerService',
    );
    const paramsToUpdate = { status: 'Active' };
    if (creditDocument && !creditDocument.expiresAt) {
      const expiresAt = this.calculateExpiryTime(
        creditDocument.validityDuration,
      );
      paramsToUpdate['expiresAt'] = expiresAt;
    }
    return this.creditRepository.updateCreditDetail(
      { _id: creditId },
      paramsToUpdate,
    );
  }

  fetchCreditDetails() {
    Logger.log(
      'fetchCreditDetails() method to fetch list of credit details',
      'CreditManagerService',
    );
    // check for serviceId
    const pipeline = [
      {
        $addFields: {
          expiresAtExists: {
            $cond: [{ $ifNull: ['$expiresAt', false] }, 1, 0],
          },
        },
      },
      {
        $sort: {
          expiresAtExists: -1,
          expiresAt: 1,
        },
      },
      { $project: { expiresAtExists: 0 } },
    ];
    return this.creditRepository.findBasedOnAggregationPipeline(pipeline);
  }

  fetchParticularCreditDetail(creditId: string, appId: string) {
    // check for serviceId
    Logger.log(
      'fetchParticularCreditDetail() method to fetch particular credit detail',
      'CreditManagerService',
    );
    return this.creditRepository.findParticularCreditDetail({
      _id: creditId,
      serviceId: appId,
    });
  }

  calculateExpiryTime(validityDuration: number) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDuration);
    return expiryDate;
  }

  async getActiveCredit(requiredAttestationCost = '0') {
    Logger.log(
      'Inside getActiveCredit() to fetch available credit detail',
      'CreditmanagerService',
    );
    const pipeline = [
      {
        $match: {
          status: 'Active',
          expiresAt: { $gt: new Date() },
        },
      },
      {
        $addFields: {
          remainingCredits: { $subtract: ['$totalCredits', '$used'] },
          attestationAmount: { $toInt: '$credit.amount' },
        },
      },
      {
        $match: {
          remainingCredits: { $gt: 0 },
          ...(Number(requiredAttestationCost) > 0
            ? { attestationAmount: { $gte: Number(requiredAttestationCost) } }
            : {}),
        },
      },
    ];
    const activeCreditDetail =
      await this.creditRepository.findBasedOnAggregationPipeline(pipeline);
    return activeCreditDetail?.[0] ?? null;
  }

  async getNextAvailableCredit(requiredAttestationCost = '0') {
    Logger.log(
      'Inside getActiveCredit() to fetch available credit detail',
      'CreditmanagerService',
    );

    const pipeline = [
      {
        $match: {
          status: 'Inactive',
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
          ],
        },
      },
      {
        $addFields: {
          remainingCredits: { $subtract: ['$totalCredits', '$used'] },
          attestationAmount: { $toInt: '$credit.amount' },
        },
      },
      {
        $match: {
          remainingCredits: { $gt: 0 },
          ...(Number(requiredAttestationCost) > 0
            ? { attestationAmount: { $gte: Number(requiredAttestationCost) } }
            : {}),
        },
      },
      { $sort: { createdAt: 1 } },
      { $limit: 1 },
    ];
    const nextAvailableCredit =
      await this.creditRepository.findBasedOnAggregationPipeline(pipeline);
    return nextAvailableCredit?.[0] ?? null;
  }

  updateCreditDetail(filter: any, updateParam: any) {
    Logger.log('updateCreditDetail() to update some parametr of credit');
    return this.creditRepository.updateCreditDetail(filter, updateParam);
  }

  convertValidityDurationToDays(
    validityDuration: number,
    validityDurationUnit: ValidityPeriodUnit,
  ): number {
    switch (validityDurationUnit) {
      case ValidityPeriodUnit.WEEK:
        return validityDuration * 7;
      case ValidityPeriodUnit.MONTH:
        return validityDuration * 30;
      case ValidityPeriodUnit.YEAR:
        return validityDuration * 365;
      case ValidityPeriodUnit.DAYS:
      default:
        return validityDuration;
    }
  }

}
