import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCreditManagerDto,
  CreditManagerRequestDto,
  CreditNotificationJobNames,
  ValidityPeriodUnit,
} from '../dto/create-credit-manager.dto';
import { CreditManagerRepository } from '../repository/credit-manager.repository';
import { CreditManager, Status } from '../schema/credit-manager.schema';
import { ConfigService } from '@nestjs/config';
import { MailClientService } from 'src/mailClient/service/mail-client.service';
import { CreditUsageNotificationJob } from 'src/mailClient/dto/create-email.dto';

@Injectable()
export class CreditService {
  private readonly creditExpiryThresholds: number[];
  private readonly creditUsageThresholds: number[];
  constructor(
    private readonly creditRepository: CreditManagerRepository,
    private readonly configService: ConfigService,
    private readonly mailClientService: MailClientService,
  ) {
    this.creditExpiryThresholds =
      this.configService
        .get<string>('CREDIT_EXPIRY_THRESHOLDS')
        ?.split(',')
        .map((threshold) => Number(threshold.trim()))
        .filter((threshold) => !isNaN(threshold))
        .sort((a, b) => b - a) ?? [];
    this.creditUsageThresholds =
      this.configService
        .get<string>('CREDIT_USAGE_THRESHOLDS')
        ?.split(',')
        .map((threshold) => Number(threshold.trim()))
        .filter((threshold) => !isNaN(threshold))
        .sort((a, b) => a - b) ?? [];
  }
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
      { $project: { expiresAtExists: 0, creditedBy: 0 } },
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
  async checkAndTriggerUsageNotification(plan: CreditManager) {
    Logger.log(
      'Inside checkAndTriggerUsageNotification() to send notification',
      'CreditManagerService',
    );
    try {
      const { totalCredits, used, serviceId } = plan;
      if (!totalCredits || totalCredits <= 0) return;
      const usedCredits = used || 0;
      const usedPercentage = Math.floor((usedCredits / totalCredits) * 100);
      if (this.creditUsageThresholds.length === 0) return;
      let thresholdToNotify: number | null = null;
      const lastNotifiedThreshold =
        plan.notification?.lastNotifiedUsageThreshold || 0;
      for (const threshold of this.creditUsageThresholds) {
        if (usedPercentage >= threshold && threshold > lastNotifiedThreshold) {
          thresholdToNotify = threshold;
        }
      }
      if (!thresholdToNotify) return;
      // 🚀 Push job to BullMQ
      const notificationQueue =
        this.configService.get('DASHBOARD_NOTIFICATION_QUEUE') ||
        'Credit-Usage-Notification-Queue';
      await this.mailClientService.addAJob<CreditUsageNotificationJob>(
        {
          serviceId: plan.serviceId,
          totalCredits: plan.totalCredits,
          usedCredits: plan.used,
          usedPercentage,
          threshold: thresholdToNotify,
          expiresAt: plan.expiresAt?.toISOString(),
        },
        notificationQueue,
        CreditNotificationJobNames.CREDIT_USAGE,
      );

      const updatedResult = await this.creditRepository.updateCreditDetail(
        {
          serviceId,
          status: Status.ACTIVE,
          $or: [
            {
              'notification.lastNotifiedUsageThreshold': {
                $exists: false,
              },
            },
            {
              'notification.lastNotifiedUsageThreshold': {
                $lt: thresholdToNotify,
              },
            },
          ],
        },
        {
          $set: {
            'notification.lastNotifiedUsageThreshold': thresholdToNotify,
          },
        },
      );
      if (!updatedResult) {
        Logger.log(
          `Skipping credit usage notification | serviceId=${serviceId} | threshold=${thresholdToNotify} | Reason: Already notified or no active plan found`,
        );
        return;
      }
    } catch (e: any) {
      Logger.error(
        `Failed to trigger usage notification for serviceId: ${plan.serviceId}`,
        e?.stack || e,
      );
    }
  }
  async checkAndTriggerExpiryNotification(plan: CreditManager) {
    Logger.log(
      'Inside checkAndTriggerExpiryNotification() to send notification',
      'CreditManagerService',
    );
    try {
      if (!plan.expiresAt) return;

      const remainingDays = Math.max(
        Math.ceil(
          (plan.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
        0,
      );
      if (this.creditExpiryThresholds.length === 0) return;

      const lastThreshold = plan.notification?.expiryThresholdsSent;

      let thresholdToNotify: number | null = null;

      for (const threshold of this.creditExpiryThresholds) {
        if (
          remainingDays <= threshold &&
          (lastThreshold === undefined || threshold < lastThreshold)
        ) {
          thresholdToNotify = threshold;
          break;
        }
      }
      if (thresholdToNotify === null) return;
      const notificationQueue =
        this.configService.get('DASHBOARD_NOTIFICATION_QUEUE') ||
        'Credit-Notification-Queue';

      await this.mailClientService.addAJob(
        {
          serviceId: plan.serviceId,
          totalCredits: plan.totalCredits,
          usedCredits: plan.used,
          expiresAt: plan.expiresAt.toISOString(),
          remainingDays,
          threshold: thresholdToNotify,
        },
        notificationQueue,
        CreditNotificationJobNames.CREDIT_EXPIRY,
      );
      const updatedResult = await this.creditRepository.updateCreditDetail(
        {
          serviceId: plan.serviceId,
          status: Status.ACTIVE,
          $or: [
            {
              'notification.expiryThresholdsSent': {
                $exists: false,
              },
            },
            {
              'notification.expiryThresholdsSent': {
                $gt: thresholdToNotify,
              },
            },
          ],
        },
        {
          $set: {
            'notification.expiryThresholdsSent': thresholdToNotify,
          },
        },
      );
      if (!updatedResult) {
        Logger.log(
          `Skipping credit expiry notification | serviceId=${plan.serviceId} | threshold=${thresholdToNotify} | Reason: Already notified or no active plan found`,
        );
        return;
      }
    } catch (e: any) {
      Logger.error(
        `Failed to trigger expiry notification for serviceId: ${plan.serviceId}`,
        e?.stack || e,
      );
    }
  }
  async checkAndTriggerNotifications(planId: string) {
    const plan = await this.creditRepository.findParticularCreditDetail({
      _id: planId,
    });

    if (!plan) {
      return;
    }

    this.checkAndTriggerUsageNotification(plan);
    this.checkAndTriggerExpiryNotification(plan);
  }
}
