import { ApiProperty } from '@nestjs/swagger';

export class QueueMessageStats {
  @ApiProperty({ description: 'Total messages in queue' })
  messages: number;

  @ApiProperty({ description: 'Messages ready for delivery' })
  messages_ready: number;

  @ApiProperty({ description: 'Messages unacknowledged by consumers' })
  messages_unacknowledged: number;

  @ApiProperty({ description: 'Number of consumers on this queue' })
  consumers: number;

  @ApiProperty({ description: 'Queue name' })
  name: string;

  @ApiProperty({ description: 'Queue state (running, idle, etc.)' })
  state: string;

  @ApiProperty({ description: 'Virtual host' })
  vhost: string;

  @ApiProperty({ description: 'Whether the queue is durable' })
  durable: boolean;
}

export class AllQueuesInfoDto {
  @ApiProperty({ type: QueueMessageStats })
  mainQueue: QueueMessageStats;

  @ApiProperty({ type: QueueMessageStats })
  dlq: QueueMessageStats;
}

export class PeekMessageDto {
  @ApiProperty({ description: 'Routing key of the message' })
  routing_key: string;

  @ApiProperty({ description: 'Decoded message payload' })
  payload: string;

  @ApiProperty({ description: 'Message properties (headers, etc.)' })
  properties: Record<string, any>;

  @ApiProperty({ description: 'Payload bytes size' })
  payload_bytes: number;

  @ApiProperty({ description: 'Whether the message was redelivered' })
  redelivered: boolean;
}
