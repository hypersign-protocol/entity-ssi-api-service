import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseFilters,
  UsePipes,
  ValidationPipe,
  Req,
  Query,
  HttpCode,
  UseInterceptors,
  Headers,
  Logger,
} from '@nestjs/common';
import {
  PresentationRequestService,
  PresentationService,
} from '../services/presentation.service';
import { CreatePresentationTemplateDto } from '../dto/create-presentation-templete.dto';
import { UpdatePresentationDto } from '../dto/update-presentation.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AllExceptionsFilter } from 'src/utils/utils';
import { PaginationDto } from 'src/utils/pagination.dto';
import {
  PTemplateError,
  PTemplateNotFoundError,
} from '../dto/error-presentation.dto';
import { PresentationTemplate } from '../schemas/presentation-template.schema';
import {
  CreatePresentationRequestDto,
  CreatePresentationDto,
  CreatePresentationResponse,
  PresentationResponse,
} from '../dto/create-presentation-request.dto';
import {
  VerifyPresentationDto,
  VerifyPresentationResponse,
} from '../dto/verify-presentation.dto';
import { TemplateResponseInterceptor } from '../interceptors/transformResponse.interseptor';
import { GetPresentationTemplateListList } from '../dto/fetch-presentationTemp.dto';

@ApiTags('Presentation Template')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('Authorization')
@UseFilters(AllExceptionsFilter)
@Controller('presentation')
export class PresentationTempleteController {
  constructor(
    private readonly presentationService: PresentationService,
    private readonly presentationRequestService: PresentationRequestService,
  ) {}
  @UsePipes(new ValidationPipe({ transform: true }))
  @Post('template')
  @ApiCreatedResponse({
    description: 'presentaion template  Created',
    type: CreatePresentationTemplateDto,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'name must be unique for an app',
    type: PTemplateError,
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
  createPresentationTemplate(
    @Headers('Authorization') authorization: string,
    @Body() createPresentationTemplateDto: CreatePresentationTemplateDto,
    @Req() req: any,
  ): Promise<PresentationTemplate> {
    Logger.log(
      'createPresentationTemplate() method: starts',
      'PresentationTempleteController',
    );

    return this.presentationService.createPresentationTemplate(
      createPresentationTemplateDto,
      req.user,
    );
  }
  @UsePipes(new ValidationPipe({ transform: true }))
  @Get('template')
  @ApiOkResponse({
    description: 'List of presentation template',
    type: GetPresentationTemplateListList,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'No template has created for appId 42...18-....',
    type: PTemplateNotFoundError,
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
  @UseInterceptors(TemplateResponseInterceptor)
  fetchListOfPresentationTemplate(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Query() pageOption: PaginationDto,
  ): Promise<PresentationTemplate[]> {
    Logger.log(
      'fetchListOfPresentationTemplate() method: starts',
      'PresentationTempleteController',
    );

    return this.presentationService.fetchListOfPresentationTemplate(
      pageOption,
      req.user,
    );
  }

  @Get('template/:templateId')
  @ApiOkResponse({
    description: 'Presentation template detail',
    type: PresentationTemplate,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Resource not found',
    type: PTemplateNotFoundError,
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
  fetchAPresentationTemplate(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Param('templateId') templateId: string,
  ): Promise<PresentationTemplate> {
    Logger.log(
      'fetchAPresentationTemplate() method: starts',
      'PresentationTempleteController',
    );

    return this.presentationService.fetchAPresentationTemplate(
      templateId,
      req.user,
    );
  }
  @UsePipes(ValidationPipe)
  @Patch('template/:templateId')
  @ApiOkResponse({
    description: 'Template Updated',
    type: PresentationTemplate,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Error occured at the time of updating',
    type: PTemplateError,
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
  updatePresentationTemplate(
    @Headers('Authorization') authorization: string,
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Body() updatePresentationDto: UpdatePresentationDto,
  ) {
    Logger.log(
      'updatePresentationTemplate() method: starts',
      'PresentationTempleteController',
    );

    return this.presentationService.updatePresentationTemplate(
      templateId,
      updatePresentationDto,
      req.user,
    );
  }

  @Delete('template/:templateId')
  @ApiOkResponse({
    description: 'Template Deleted Successfully',
    type: PresentationTemplate,
  })
  @ApiNotFoundResponse({
    description: `No resource found for templateId 63d7c558743fea9d22aab...`,
    type: PTemplateNotFoundError,
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
  remove(
    @Headers('Authorization') authorization: string,
    @Param('templateId') templateId: string,
    @Req() req: any,
  ) {
    Logger.log('remove() method: starts', 'PresentationTempleteController');

    return this.presentationService.deletePresentationTemplate(
      templateId,
      req.user,
    );
  }
}
@ApiTags('Presentation')
@Controller('presentation')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('Authorization')
@UseFilters(AllExceptionsFilter)
export class PresentationController {
  constructor(
    private readonly presentationRequestService: PresentationRequestService,
  ) {}
  @UsePipes(ValidationPipe)
  @Post()
  @HttpCode(200)
  @ApiOkResponse({
    description: 'Response of presentation',
    type: PresentationResponse,
  })
  @ApiNotFoundResponse({
    description: 'did:hid:testnet:......#key-${id} not found',
    type: PTemplateNotFoundError,
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
    @Body() presentation: CreatePresentationDto,
    @Req() req,
  ) {
    Logger.log('create() method: starts', 'PresentationController');

    return this.presentationRequestService.createPresentation(
      presentation,
      req.user,
    );
  }
  @UsePipes(new ValidationPipe({ transform: true }))
  @Post('request')
  @ApiCreatedResponse({
    description: 'Presentation request is created',
    type: CreatePresentationResponse,
  })
  @ApiBadRequestResponse({
    description: 'templeteId :62874356...  not found',
    type: PTemplateError,
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
  createPresentationRequest(
    @Headers('Authorization') authorization: string,
    @Body() createPresentationRequestDto: CreatePresentationRequestDto,
    @Req() req,
  ) {
    Logger.log(
      'createPresentationRequest() method: starts',
      'PresentationController',
    );

    return this.presentationRequestService.createPresentationRequest(
      createPresentationRequestDto,
      req.user,
    );
  }
  @UsePipes(ValidationPipe)
  @Post('/verify')
  @ApiOkResponse({
    description: 'presentation verification done successfully',
    type: VerifyPresentationResponse,
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
    @Body() presentation: VerifyPresentationDto,
    @Req() req,
  ) {
    Logger.log('verify() method: starts', 'PresentationController');

    return this.presentationRequestService.verifyPresentation(
      presentation,
      req.user,
    );
  }
}
