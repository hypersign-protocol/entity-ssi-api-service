import { Test, TestingModule } from '@nestjs/testing';
import { CreditManagerController } from './credit-manager.controller';
import { CreditService } from '../services/credit-manager.service';

describe('CreditManagerController', () => {
  let controller: CreditManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditManagerController],
      providers: [CreditService],
    }).compile();

    controller = module.get<CreditManagerController>(CreditManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
