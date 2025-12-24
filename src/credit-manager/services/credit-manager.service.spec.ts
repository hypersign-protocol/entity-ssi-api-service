import { Test, TestingModule } from '@nestjs/testing';
import { CreditManagerService } from './credit-manager.service';

describe('CreditManagerService', () => {
  let service: CreditManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditManagerService],
    }).compile();

    service = module.get<CreditManagerService>(CreditManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
