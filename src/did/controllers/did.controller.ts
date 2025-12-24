import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UseFilters,
  Patch,
  UsePipes,
  ValidationPipe,
  Query,
  UseInterceptors,
  Headers,
  Logger,
} from '@nestjs/common';
import { DidService } from '../services/did.service';
import {
  CreateDidDto,
  RegisterDidResponse,
  TxnHash,
  CreateDidResponse,
} from '../dto/create-did.dto';
import {
  UpdateDidDto,
  ResolvedDid,
  UpdateDidResp,
} from '../dto/update-did.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiHeader,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { classToPlain } from 'class-transformer';
import {
  DidConflictError,
  DidError,
  DidNotFoundError,
} from '../dto/error-did.dto';
import { AllExceptionsFilter } from '../../utils/utils';
import { PaginationDto } from 'src/utils/pagination.dto';
import { Did } from '../schemas/did.schema';
import { DidResponseInterceptor } from '../interceptors/transformResponse.interseptor';
import { GetDidList } from '../dto/fetch-did.dto';
import { RegisterDidDto, RegisterV2DidDto } from '../dto/register-did.dto';
import { IKeyType } from 'hs-ssi-sdk';
import { AtLeastOneParamPipe } from 'src/utils/Pipes/atleastOneParam.pipe';
import { AddVMResponse, AddVerificationMethodDto } from '../dto/addVm.dto';
import { SignDidDto, SignedDidDocument } from '../dto/sign-did.dto';
import { VerifyDidDocResponseDto, VerifyDidDto } from '../dto/verify-did.dto';
import { ReduceCreditGuard } from 'src/credit-manager/gaurd/reduce-credit.gaurd';
import { AccessGuard } from 'src/utils/guards/access.gaurd';
import { Access } from 'src/utils/customDecorator/access.decorator';
import { ACCESS_TYPES } from 'src/credit-manager/utils';
@UseFilters(AllExceptionsFilter)
@ApiTags('Did')
@Controller('did')
@ApiBearerAuth('Authorization')
@UseGuards(AuthGuard('jwt'), ReduceCreditGuard, AccessGuard)
export class DidController {
  constructor(private readonly didService: DidService) {}

  @UsePipes(new ValidationPipe({ transform: true }))
  @Access(ACCESS_TYPES.READ_DID)
  @Get()
  @ApiOkResponse({
    description: 'DID List',
    type: GetDidList,
    isArray: true,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Error in finding resource',
    type: DidNotFoundError,
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
  @UseInterceptors(DidResponseInterceptor)
  getDidList(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Query()
    pageOption: PaginationDto,
  ): Promise<Did[]> {
    Logger.log('getDidList() method: starts', 'DidController');
    const appDetail = req.user;

    return this.didService.getDidList(appDetail, pageOption);
  }
  @Access(ACCESS_TYPES.READ_DID)
  @Get('resolve/:did')
  @ApiOkResponse({
    description: 'DID Resolved',
    type: ResolvedDid,
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
  resolveDid(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Param('did') did: string,
  ): Promise<ResolvedDid> {
    Logger.log('resolveDid() method: starts', 'DidController');
    const appDetail = req.user;
    return this.didService.resolveDid(appDetail, did);
  }
  @UsePipes(
    new ValidationPipe({
      // whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  @Access(ACCESS_TYPES.WRITE_DID)
  @Post('create')
  @ApiCreatedResponse({
    description: 'DID Created',
    type: CreateDidResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of creating did',
    type: DidError,
  })
  @ApiConflictResponse({
    status: 409,
    description: 'Duplicate key error',
    type: DidConflictError,
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
    @Body() createDidDto: CreateDidDto,
    @Req() req: any,
  ) {
    Logger.log('create() method: starts', 'DidController');
    const { options } = createDidDto;
    const appDetail = req.user;
    const keyTypes = Array.isArray(options?.keyType)
      ? options.keyType
      : options?.keyType
      ? [options.keyType]
      : [IKeyType.Ed25519VerificationKey2020];
    const keyTypeAtZeroIndex = keyTypes[0];
    switch (keyTypeAtZeroIndex) {
      case IKeyType.EcdsaSecp256k1RecoveryMethod2020: {
        const response = this.didService.createByClientSpec(
          createDidDto,
          appDetail,
        );
        return classToPlain(response, { excludePrefixes: ['transactionHash'] });
      }

      case IKeyType.EcdsaSecp256k1VerificationKey2019: {
        const response = this.didService.createByClientSpec(
          createDidDto,
          appDetail,
        );

        return classToPlain(response, { excludePrefixes: ['transactionHash'] });
      }
      case IKeyType.BabyJubJubKey2021: {
        const response = this.didService.createBjjDid(
          createDidDto,
          appDetail,
          keyTypes,
        );
        return classToPlain(response, { excludePrefixes: ['transactionHash'] });
      }

      default:
        const response = this.didService.create(
          createDidDto,
          appDetail,
          keyTypes,
        );
        return classToPlain(response, { excludePrefixes: ['transactionHash'] });
    }
  }
  @Access(ACCESS_TYPES.WRITE_DID)
  @Post('/addVerificationMethod')
  @ApiOkResponse({
    description: 'Added vm to Did Document',
    type: AddVMResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description:
      'Error occured at the time of adding verification method to did document',
    type: DidError,
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
  @UsePipes(ValidationPipe)
  @UsePipes(new AtLeastOneParamPipe(['did', 'didDocument']))
  addVerficationMethod(
    @Headers('Authorization') authorization: string,
    @Body() addVm: AddVerificationMethodDto,
  ) {
    Logger.log('addVerificationMethod() method: starts', 'DidController');
    return this.didService.addVerificationMethod(addVm);
  }
  @Access(ACCESS_TYPES.WRITE_DID)
  @Post('/auth/sign')
  @ApiOkResponse({
    description: 'DidDocument is signed successfully',
    type: SignedDidDocument,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of signing did',
    type: DidError,
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
  @UsePipes(ValidationPipe)
  @UsePipes(new AtLeastOneParamPipe(['did', 'didDocument']))
  SignDidDocument(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Body() signDidDocDto: SignDidDto,
  ) {
    Logger.log('SignDidDocument() method: starts', 'DidController');
    return this.didService.SignDidDocument(signDidDocDto, req.user);
  }
  @Access(ACCESS_TYPES.VERIFY_DID_SIGNATURE)
  @Post('/auth/verify')
  @ApiOkResponse({
    description: 'DidDocument is verified successfully',
    type: VerifyDidDocResponseDto,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of verifing did',
    type: DidError,
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
  @UsePipes(ValidationPipe)
  VerifyDidDocument(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Body() verifyDidDto: VerifyDidDto,
  ) {
    Logger.log('VerifyDidDocument() method: starts', 'DidController');
    return this.didService.VerifyDidDocument(verifyDidDto, req.user);
  }

  @ApiOkResponse({
    description: 'DID Registred',
    type: RegisterDidResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of creating did',
    type: DidError,
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
  @Access(ACCESS_TYPES.WRITE_DID)
  @Post('/register')
  @UsePipes(ValidationPipe)
  register(
    @Headers('Authorization') authorization: string,
    @Body() registerDidDto: RegisterDidDto,
    @Req() req: any,
  ) {
    Logger.log('register() method: starts', 'DidController');

    const appDetail = req.user;
    return this.didService.register(registerDidDto, appDetail);
  }
  @Access(ACCESS_TYPES.WRITE_DID)
  @Patch()
  @ApiOkResponse({
    description: 'DID Updated',
    type: UpdateDidResp,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Invalid didDoc',
    type: DidError,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Resource not found',
    type: DidNotFoundError,
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
  @UsePipes(ValidationPipe)
  @UsePipes(new AtLeastOneParamPipe(['name', 'didDocument']))
  updateDid(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Body() updateDidDto: UpdateDidDto,
  ) {
    Logger.log('updateDid() method: starts', 'DidController');

    const appDetail = req.user;
    return this.didService.updateDid(updateDidDto, appDetail);
  }
  @ApiOkResponse({
    description: 'DID Registred',
    type: RegisterDidResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of creating did',
    type: DidError,
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
  @UsePipes(ValidationPipe)
  @Access(ACCESS_TYPES.WRITE_DID)
  @Post('register/v2')
  registerV2(
    @Headers('Authorization') authorization: string,
    @Body() registerV2Dto: RegisterV2DidDto,
    @Req() req: any,
  ) {
    Logger.log('registerV2() method: starts', 'DidController');
    const appDetail = req.user;
    return this.didService.registerV2(registerV2Dto, appDetail);
  }
}
