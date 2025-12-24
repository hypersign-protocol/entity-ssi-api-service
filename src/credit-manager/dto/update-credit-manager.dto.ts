import { PartialType } from '@nestjs/mapped-types';
import { CreateCreditManagerDto } from './create-credit-manager.dto';

export class UpdateCreditManagerDto extends PartialType(
  CreateCreditManagerDto,
) {}
