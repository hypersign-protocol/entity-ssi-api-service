import {
  Controller,
  Get,
  Post,
  Param,
  UseFilters,
  UseGuards,
  Logger,
  Req,
  Body,
} from '@nestjs/common';
import { CreditService } from '../services/credit-manager.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  createCreditResponse,
  ActivateCredtiResponse,
} from '../dto/create-credit-manager.dto';
import { AllExceptionsFilter } from 'src/utils/utils';
import {
  CreditError,
  CreditNotFoundError,
  CreditUnAuthorizeError,
} from '../dto/error-credit.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreditAuthGuard } from '../gaurd/credit-token.gaurd';
import { AccessGuard } from 'src/utils/guards/access.gaurd';
import { Access } from 'src/utils/customDecorator/access.decorator';
import { ACCESS_TYPES } from '../utils';

@UseFilters(AllExceptionsFilter)
@ApiTags('Credit')
@Controller('credit')
export class CreditManagerController {
  constructor(private readonly creditManagerService: CreditService) {}
  @ApiBearerAuth('Authorization')
  @UseGuards(CreditAuthGuard, AccessGuard)
  @ApiCreatedResponse({
    description: 'Credit detail is added successfully',
    type: createCreditResponse,
  })
  @ApiBadRequestResponse({
    description: 'Unable to add credit detail',
    type: CreditError,
  })
  @ApiNotFoundResponse({
    description: 'Missing',
    type: CreditNotFoundError,
  })
  @ApiUnauthorizedResponse({
    description: 'Authorization token is invalid or expired.',
    type: CreditUnAuthorizeError,
  })
  @Access(ACCESS_TYPES.WRITE_CREDIT)
  @Post()
  AddNewCreditDetail(@Req() req) {
    Logger.log(
      'AddNewCreditDetail() method to add credit detail',
      'CreditManagerController',
    );
    return this.creditManagerService.addCreditDetail(req.creditDetail);
  }
  @ApiBearerAuth('Authorization')
  @UseGuards(AuthGuard('jwt'), AccessGuard)
  @ApiOkResponse({
    description: 'Credit is activated successfully',
    type: ActivateCredtiResponse,
  })
  @ApiBadRequestResponse({
    description: 'Unable to activate credit detail',
    type: CreditError,
  })
  @ApiNotFoundResponse({
    description: 'Authorization token is invalid or expired.',
    type: CreditNotFoundError,
  })
  @ApiUnauthorizedResponse({
    description: 'Authorization token is invalid or expired.',
    type: CreditUnAuthorizeError,
  })
  @Access(ACCESS_TYPES.WRITE_CREDIT)
  @Post(':creditId/activate')
  activateCredit(@Param('creditId') creditId: string) {
    Logger.log(
      'activateCredit() method to activate existing credit detail',
      'CreditManagerController',
    );
    return this.creditManagerService.activateCredit(creditId);
  }
  @ApiBearerAuth('Authorization')
  @UseGuards(AuthGuard('jwt'), AccessGuard)
  @ApiOkResponse({
    description: 'Fetched all credit detail',
    type: createCreditResponse,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Unable to fetch credit detail',
    type: CreditError,
  })
  @ApiUnauthorizedResponse({
    description: 'Authorization token is invalid or expired.',
    type: CreditUnAuthorizeError,
  })
  @Access(ACCESS_TYPES.READ_CREDIT)
  @Get()
  fetchCreditDetails() {
    Logger.log(
      'fetchCreditDetails() method to fetch all credit detail',
      'CreditManagerController',
    );
    return this.creditManagerService.fetchCreditDetails();
  }
  @ApiBearerAuth('Authorization')
  @UseGuards(AuthGuard('jwt'), AccessGuard)
  @ApiOkResponse({
    description: 'The details of the credit have been successfully fetched.',
    type: createCreditResponse,
  })
  @ApiBadRequestResponse({
    description: 'Unable to fetch particular credit detail',
    type: CreditError,
  })
  @ApiUnauthorizedResponse({
    description: 'Authorization token is invalid or expired.',
    type: CreditUnAuthorizeError,
  })
  @Access(ACCESS_TYPES.READ_CREDIT)
  @Get(':creditId')
  fetchParticularCreditDetail(@Param('creditId') creditId: string, @Req() req) {
    Logger.log(
      'fetchParticularCreditDetail() method to fetch particular credit detail',
      'CreditManagerController',
    );
    const appId = req.user.appId;
    return this.creditManagerService.fetchParticularCreditDetail(
      creditId,
      appId,
    );
  }
}
