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
// import { AllExceptionsFilter } from '../../../utility/exception.filter';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
// import { CustomAuthGuard } from 'src/auth/auth.guard';
// import { CreditAuthGuard } from 'src/auth/credit-token.guard';
import {
  createCreditResponse,
  ActivateCredtiResponse,
  CreditManagerRequestDto,
} from '../dto/create-credit-manager.dto';
import { AllExceptionsFilter } from 'src/utils/utils';
import {
  CreditError,
  CreditNotFoundError,
  CreditUnAuthorizeError,
} from '../dto/error-credit.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreditAuthGuard } from '../gaurd/credit-token.gaurd';

@UseFilters(AllExceptionsFilter)
@ApiTags('Credit')
@Controller('credit')
export class CreditManagerController {
  constructor(private readonly creditManagerService: CreditService) {}
  @ApiBearerAuth('Authorization')
  @UseGuards(CreditAuthGuard)
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
  @Post()
  AddNewCreditDetail(@Body() body: CreditManagerRequestDto, @Req() req) {
    Logger.log(
      'AddNewCreditDetail() method to add credit detail',
      'CreditManagerController',
    );
    return this.creditManagerService.addCreditDetail(body, req.creditDetail);
  }
  @ApiBearerAuth('Authorization')
  @UseGuards(AuthGuard('jwt'))
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
  @Post(':creditId/activate')
  activateCredit(@Param('creditId') creditId: string) {
    Logger.log(
      'activateCredit() method to activate existing credit detail',
      'CreditManagerController',
    );
    return this.creditManagerService.activateCredit(creditId);
  }
  @ApiBearerAuth('Authorization')
  @UseGuards(AuthGuard('jwt'))
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
  @Get()
  fetchCreditDetails() {
    Logger.log(
      'fetchCreditDetails() method to fetch all credit detail',
      'CreditManagerController',
    );
    return this.creditManagerService.fetchCreditDetails();
  }
  @ApiBearerAuth('Authorization')
  @UseGuards(AuthGuard('jwt'))
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
