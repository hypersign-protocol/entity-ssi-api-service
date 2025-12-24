import { PartialType } from '@nestjs/swagger';
import { FetchUsageRespDetail } from './create-usage.dto';

export class UpdateUsageDto extends PartialType(FetchUsageRespDetail) {}
