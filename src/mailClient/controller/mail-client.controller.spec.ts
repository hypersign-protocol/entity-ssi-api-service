import { Test, TestingModule } from '@nestjs/testing';
import { MailClientController } from './mail-client.controller';

describe('MailClientController', () => {
  let controller: MailClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailClientController],
    }).compile();

    controller = module.get<MailClientController>(MailClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
