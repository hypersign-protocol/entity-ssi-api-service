import {
  Controller,
  Post,
  Body,
  InternalServerErrorException,
  NotImplementedException,
} from '@nestjs/common';
import { MailClientService } from '../service/mail-client.service';

@Controller('mail-client')
export class MailClientController {
  constructor(private readonly bullQueueService: MailClientService) {}

  @Post('add-job')
  async addJob(
    @Body()
    data: { serverName: string; to: string; subject: string; message: any }[],
  ) {
    throw new NotImplementedException([
      'Add job functionality is not implemented yet',
    ]);
  }
}
