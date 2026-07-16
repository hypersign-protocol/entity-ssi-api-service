import { Controller, Post, Body } from '@nestjs/common';
import { MailClientService } from '../service/mail-client.service';

@Controller('mail-client')
export class MailClientController {
  constructor(private readonly bullQueueService: MailClientService) {}

  @Post('add-job')
  async addJob(
    @Body()
    data: { serverName: string; to: string; subject: string; message: any }[],
  ) {
    await this.bullQueueService.addJobsInBulk(data);
    return { message: 'Jobs are added to the queue successfully' };
  }
}
