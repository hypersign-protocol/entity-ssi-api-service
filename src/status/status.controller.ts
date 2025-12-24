import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { StatusService } from './status.service';

import {
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaginationDto } from 'src/utils/pagination.dto';
import { AllExceptionsFilter } from 'src/utils/utils';
import { RegistrationStatus } from './schema/status.schema';
import { RegistrationStatusList } from './dto/registration-status.response.dto';
import { RegistrationStatusInterceptor } from './transformer/staus-response.interceptor';
import { AccessGuard } from 'src/utils/guards/access.gaurd';
import { Access } from 'src/utils/customDecorator/access.decorator';
import { ACCESS_TYPES } from 'src/credit-manager/utils';
@UseFilters(AllExceptionsFilter)
@ApiTags('Status')
@ApiBearerAuth('Authorization')
@Controller('status')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class StatusController {
  constructor(private readonly statusService: StatusService) {}
  @Access(ACCESS_TYPES.CHECK_LIVE_STATUS)
  @Get('ssi/:id')
  @ApiResponse({
    description: 'List of the txns',
    type: RegistrationStatusList,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page value',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Fetch limited list of data',
    required: false,
  })
  @ApiParam({
    name: 'id',
    description: 'Enter didId or vcId or schemaId',
  })
  @UseInterceptors(RegistrationStatusInterceptor)
  getStatus(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ): Promise<RegistrationStatusList> {
    return this.statusService.findBySsiId(id, pagination);
  }
  @Access(ACCESS_TYPES.READ_TX)
  @Get('transaction/:transactionHash')
  @ApiResponse({
    description: 'List of the txns',
    type: RegistrationStatusList,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page value',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Fetch limited list of data',
    required: false,
  })
  @ApiParam({
    name: 'transactionHash',
    description: 'Enter transactionHash',
  })
  @UseInterceptors(RegistrationStatusInterceptor)
  getStatusByTransactionHash(
    @Param('transactionHash') transactionHash: string,
    @Query() pagination: PaginationDto,
  ): Promise<RegistrationStatusList> {
    return this.statusService.findByTxnId(transactionHash, pagination);
  }
}
