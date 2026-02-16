import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  Query,
  HttpCode,
  UseInterceptors,
  Headers,
  Logger,
} from '@nestjs/common';
import { CredentialService } from '../services/credential.service';
import {
  CreateCredentialDto,
  CreateCredentialResponse,
  ResolveCredential,
  ResolvedCredentialStatus,
} from '../dto/create-credential.dto';
import { UpdateCredentialDto } from '../dto/update-credential.dto';
import {
  CredentialError,
  CredentialNotFoundError,
} from '../dto/error-credential.dto';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiTags,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaginationDto } from 'src/utils/pagination.dto';
import {
  VerifyCredentialDto,
  VerifyCredentialResponse,
} from '../dto/verify-credential.dto';
import { BooleanPipe } from 'src/utils/Pipes/boolean.pipe';
import { CredentialResponseInterceptor } from '../interceptors/transformResponse.interseptor';
import { Credential } from '../schemas/credntial.schema';
import { GetCredentialList } from '../dto/fetch-credential.dto';
import { RegisterCredentialStatusDto } from '../dto/register-credential.dto';
import { TxnHash } from 'src/did/dto/create-did.dto';
import { ReduceCreditGuard } from 'src/credit-manager/gaurd/reduce-credit.gaurd';
import { AccessGuard } from 'src/utils/guards/access.gaurd';
import { Access } from 'src/utils/customDecorator/access.decorator';
import { ACCESS_TYPES } from 'src/credit-manager/utils';
@ApiBearerAuth('Authorization')
@UseGuards(AuthGuard('jwt'), ReduceCreditGuard, AccessGuard)
@Controller('credential')
@ApiTags('Credential')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}
  @UsePipes(new ValidationPipe({ transform: true }))
  @Access(ACCESS_TYPES.READ_CREDENTIAL)
  @Get()
  @ApiOkResponse({
    description: 'List of credentials',
    type: GetCredentialList,
    isArray: true,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Error in finding resource',
    type: CredentialNotFoundError,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <access_token>',
    required: false,
  })
  @ApiHeader({
    name: 'Origin',
    description: 'Origin as you set in application cors',
    required: false,
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
  @ApiQuery({
    name: 'issuerDid',
    description: 'Filter by Issuer DID',
    required: false,
  })
  @UseInterceptors(CredentialResponseInterceptor)
  findAll(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Query() pageOption: PaginationDto,
  ): Promise<Credential[]> {
    Logger.log('CredentialController:: findAll() method: starts....');
    return this.credentialService.findAll(req.user, pageOption);
  }
  @Access(ACCESS_TYPES.READ_CREDENTIAL)
  @Get(':credentialId')
  @ApiOkResponse({
    description: 'Resolved credential detail',
    type: ResolveCredential,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Credential with id vc:hid:testnet:...... not found',
    type: CredentialNotFoundError,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <access_token>',
    required: false,
  })
  @ApiHeader({
    name: 'Origin',
    description: 'Origin as you set in application cors',
    required: false,
  })
  @ApiQuery({
    name: 'retrieveCredential',
    required: false,
  })
  resolveCredential(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Param('credentialId') credentialId: string,
    @Query('retrieveCredential', BooleanPipe) retrieveCredential: boolean,
  ) {
    Logger.log('CredentialController:: resolveCredential() method: starts....');
    const appDetail = req.user;
    retrieveCredential = retrieveCredential === true ? true : false;
    return this.credentialService.resolveCredential(
      credentialId,
      appDetail,
      retrieveCredential,
    );
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @Access(ACCESS_TYPES.WRITE_CREDENTIAL)
  @Post('/issue')
  @ApiCreatedResponse({
    description: 'Credential Created',
    type: CreateCredentialResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of creating credential',
    type: CredentialError,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Resource not found',
    type: CredentialNotFoundError,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <access_token>',
    required: false,
  })
  @ApiHeader({
    name: 'Origin',
    description: 'Origin as you set in application cors',
    required: false,
  })
  create(
    @Headers('Authorization') authorization: string,
    @Body() createCredentialDto: CreateCredentialDto,
    @Req() req,
  ) {
    Logger.log('CredentialController:: create() method: starts....');
    return this.credentialService.create(createCredentialDto, req.user);
  }
  @UsePipes(ValidationPipe)
  @HttpCode(200)
  @Access(ACCESS_TYPES.VERIFY_CREDENTIAL)
  @Post('/verify')
  @ApiOkResponse({
    description: 'verification result of credential',
    type: VerifyCredentialResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of verifying credential',
    type: CredentialError,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Resource not found',
    type: CredentialNotFoundError,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <access_token>',
    required: false,
  })
  @ApiHeader({
    name: 'Origin',
    description: 'Origin as you set in application cors',
    required: false,
  })
  verify(
    @Headers('Authorization') authorization: string,
    @Body() verifyCredentialDto: VerifyCredentialDto,
    @Req() req,
  ) {
    Logger.log('CredentialController:: verify() method: starts....');
    return this.credentialService.verfiyCredential(
      verifyCredentialDto,
      req.user,
    );
  }
  @Access(ACCESS_TYPES.WRITE_CREDENTIAL)
  @UsePipes(ValidationPipe)
  @Post('status/register')
  @ApiOkResponse({
    description: 'Register credential Status',
    type: TxnHash,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of registering credential status',
    type: CredentialError,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <access_token>',
    required: false,
  })
  @ApiHeader({
    name: 'Origin',
    description: 'Origin as you set in application cors',
    required: false,
  })
  registerCred(
    @Headers('Authorization') authorization: string,
    @Body() registerCredentialDto: RegisterCredentialStatusDto,
    @Req() req,
  ) {
    Logger.log('CredentialController:: registerCred() method: starts....');
    return this.credentialService.registerCredentialStatus(
      registerCredentialDto,
      req.user,
    );
  }

  @UsePipes(ValidationPipe)
  @Patch('status/:credentialId')
  @ApiOkResponse({
    description: 'Credential Updated',
    type: ResolvedCredentialStatus,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'did:hid:testnet:........#key-${idx} not found',
    type: CredentialNotFoundError,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of creating credential',
    type: CredentialError,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <access_token>',
    required: false,
  })
  @ApiHeader({
    name: 'Origin',
    description: 'Origin as you set in application cors',
    required: false,
  })
  update(
    @Headers('Authorization') authorization: string,
    @Param('credentialId') credentialId: string,
    @Body() updateCredentialDto: UpdateCredentialDto,
    @Req() req,
  ) {
    Logger.log('CredentialController:: update() method: starts....');
    return this.credentialService.update(
      credentialId,
      updateCredentialDto,
      req.user,
    );
  }
}
