import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueMonitorService implements OnModuleInit {
  private readonly logger = new Logger(QueueMonitorService.name);

  private managementBaseUrl: string;
  private authHeader: string;
  private mainQueueName: string;
  private dlqName: string;

  // default RabbitMQ vhost encoded for use in URL path
  private readonly vhost = '%2F';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const amqUrl = this.config.get<string>('RABBIT_MQ_URI') || '';

    // Parse user / password / host out of the AMQP connection URL so we
    // don't need to introduce separate env vars.
    // Supported formats:  amqp://user:pass@host:port  |  amqps://user:pass@host:port
    const normalized = amqUrl.replace(/^amqps?:\/\//, 'http://');
    const parsed = new URL(normalized);

    const username = decodeURIComponent(parsed.username || 'guest');
    const password = decodeURIComponent(parsed.password || 'guest');
    const hostname = parsed.hostname || 'rabbitmq';

    this.managementBaseUrl = `http://${hostname}:15672`;
    this.authHeader =
      'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    this.mainQueueName =
      this.config.get<string>('GLOBAL_TXN_CONTROLLER_QUEUE') ||
      'GLOBAL_TXN_CONTROLLER_QUEUE';
    this.dlqName =
      this.config.get<string>('GLOBAL_TXN_CONTROLLER_DLQ') ||
      'GLOBAL_TXN_CONTROLLER_DLQ';

    this.logger.log(`RabbitMQ management endpoint: ${this.managementBaseUrl}`);
  }

  // -----------------------------------------------------------------------
  // Internal helper — wraps fetch with auth + error handling
  // -----------------------------------------------------------------------
  private async mgmtFetch<T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.managementBaseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternalServerErrorException(
        `RabbitMQ management API error ${res.status}: ${text}`,
      );
    }

    return res.json() as Promise<T>;
  }

  // -----------------------------------------------------------------------
  // Public methods
  // -----------------------------------------------------------------------

  private peekQueue(queueName: string, count = 10) {
    return this.mgmtFetch(
      `/api/queues/${this.vhost}/${encodeURIComponent(queueName)}/get`,
      {
        method: 'POST',
        body: JSON.stringify({
          count,
          ackmode: 'ack_requeue_true', // peek — requeues immediately
          encoding: 'auto',
          truncate: 50000,
        }),
      },
    ).catch(() => []); // if queue is empty the API may 404 — return empty array
  }

  /**
   * One stats call + two peek calls in parallel.
   * Returns stats and actual message contents for both queues.
   */
  async getAllQueuesInfo() {
    const [all, mainMessages, dlqMessages]: [any[], any[], any[]] =
      await Promise.all([
        this.mgmtFetch(`/api/queues/${this.vhost}`),
        this.peekQueue(this.mainQueueName),
        this.peekQueue(this.dlqName),
      ]);

    const pick = (name: string) => all.find((q) => q.name === name) ?? null;

    return {
      mainQueue: {
        ...pick(this.mainQueueName),
        messages: mainMessages,
      },
      dlq: {
        ...pick(this.dlqName),
        messages: dlqMessages,
      },
    };
  }

  /** Full details for the main processing queue */
  getMainQueueInfo() {
    return this.mgmtFetch(
      `/api/queues/${this.vhost}/${encodeURIComponent(this.mainQueueName)}`,
    );
  }

  /** Full details for the dead-letter queue */
  getDLQInfo() {
    return this.mgmtFetch(
      `/api/queues/${this.vhost}/${encodeURIComponent(this.dlqName)}`,
    );
  }

  /**
   * Peek at messages sitting in the DLQ without consuming them.
   * Messages are requeued immediately after reading.
   */
  peekDLQMessages(count = 10) {
    return this.peekQueue(this.dlqName, count);
  }
}
