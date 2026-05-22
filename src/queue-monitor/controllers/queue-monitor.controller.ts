import { Controller, Get, Query, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AllExceptionsFilter } from 'src/utils/utils';
import { AccessGuard } from 'src/utils/guards/access.gaurd';
import { Access } from 'src/utils/customDecorator/access.decorator';
import { ACCESS_TYPES } from 'src/credit-manager/utils';
import { QueueMonitorService } from '../services/queue-monitor.service';
import {
  AllQueuesInfoDto,
  PeekMessageDto,
  QueueMessageStats,
} from '../dto/queue-info.dto';

@UseFilters(AllExceptionsFilter)
@ApiTags('Queue Monitor')
@ApiBearerAuth('Authorization')
@UseGuards(AuthGuard('jwt'), AccessGuard)
@Controller('queue-monitor')
export class QueueMonitorController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  /**
   * GET /api/v1/queue-monitor/queues
   * Returns stats for both the main processing queue and the DLQ.
   */
  @Access(ACCESS_TYPES.CHECK_LIVE_STATUS)
  @Get('queues')
  @ApiOkResponse({
    description: 'Stats for the main queue and the dead-letter queue',
    type: AllQueuesInfoDto,
  })
  getAllQueues(): Promise<AllQueuesInfoDto> {
    return this.queueMonitorService.getAllQueuesInfo();
  }

  /**
   * GET /api/v1/queue-monitor/queues/main
   * Returns stats for the main processing queue only.
   */
  @Access(ACCESS_TYPES.CHECK_LIVE_STATUS)
  @Get('queues/main')
  @ApiOkResponse({
    description: 'Stats for the main processing queue',
    type: QueueMessageStats,
  })
  getMainQueue(): Promise<QueueMessageStats> {
    return this.queueMonitorService.getMainQueueInfo();
  }

  /**
   * GET /api/v1/queue-monitor/queues/dlq
   * Returns stats for the dead-letter queue only.
   */
  @Access(ACCESS_TYPES.CHECK_LIVE_STATUS)
  @Get('queues/dlq')
  @ApiOkResponse({
    description: 'Stats for the dead-letter queue',
    type: QueueMessageStats,
  })
  getDLQ(): Promise<QueueMessageStats> {
    return this.queueMonitorService.getDLQInfo();
  }

  /**
   * GET /api/v1/queue-monitor/queues/dlq/messages
   * Peeks at messages in the DLQ without consuming them.
   * Messages are requeued immediately after reading.
   */
  @Access(ACCESS_TYPES.CHECK_LIVE_STATUS)
  @Get('queues/dlq/messages')
  @ApiQuery({
    name: 'count',
    required: false,
    description: 'Maximum number of messages to peek (default: 10)',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Messages peeked from the DLQ (requeued immediately)',
    type: [PeekMessageDto],
  })
  peekDLQMessages(@Query('count') count?: string): Promise<PeekMessageDto[]> {
    const parsedCount = count ? parseInt(count, 10) : 10;
    return this.queueMonitorService.peekDLQMessages(parsedCount);
  }
}
