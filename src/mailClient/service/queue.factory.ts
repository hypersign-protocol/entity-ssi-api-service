import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
@Injectable()
export class QueueFactory {
  private queues: Map<string, Queue> = new Map();
  private connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
  };
  getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.connection,
      });
      this.queues.set(queueName, queue);
    }
    return this.queues.get(queueName);
  }
}
