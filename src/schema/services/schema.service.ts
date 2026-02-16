import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import {
  CreateSchemaDto,
  createSchemaResponse,
} from '../dto/create-schema.dto';
import { HypersignSchema } from 'hs-ssi-sdk';
import { ConfigService } from '@nestjs/config';
import { SchemaSSIService } from './schema.ssi.service';
import { HidWalletService } from 'src/hid-wallet/services/hid-wallet.service';
import { DidRepository } from 'src/did/repository/did.repository';
import { HypersignDID } from 'hs-ssi-sdk';
import { SchemaRepository } from '../repository/schema.repository';
import { Schemas } from '../schemas/schemas.schema';
import { RegisterSchemaDto } from '../dto/register-schema.dto';
import { Namespace } from 'src/did/dto/create-did.dto';
import { getAppVault, getAppMenemonic } from '../../utils/app-vault-service';
import { TxSendModuleService } from 'src/tx-send-module/tx-send-module.service';
import { StatusService } from 'src/status/status.service';

@Injectable({ scope: Scope.REQUEST })
export class SchemaService {
  constructor(
    private readonly schemaRepository: SchemaRepository,
    private readonly config: ConfigService,
    private readonly schemaSSIservice: SchemaSSIService,
    private readonly hidWallet: HidWalletService,
    private readonly didRepositiory: DidRepository,
    private readonly txnService: TxSendModuleService,
    private readonly statusService: StatusService,
  ) {}

  async checkAllowence(address) {
    const url =
      this.config.get('HID_NETWORK_API') +
      '/cosmos/feegrant/v1beta1/allowances/' +
      address;

    const resp = await fetch(url);

    const res = await resp.json();
    if (resp.status === 200) {
      if (res.allowances.length > 0) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  }
  async create(
    createSchemaDto: CreateSchemaDto,
    appDetail,
  ): Promise<createSchemaResponse> {
    Logger.log('create() method: starts....', 'SchemaService');
    const { schema } = createSchemaDto;
    const { namespace, verificationMethodId } = createSchemaDto;
    const { author } = schema;
    const { edvId, kmsId } = appDetail;
    const didOfvmId = verificationMethodId.split('#')[0];
    Logger.log('create() method: initialising edv service', 'SchemaService');
    const didInfo = await this.didRepositiory.findOne({
      appId: appDetail.appId,
      did: didOfvmId,
    });
    if (!didInfo || didInfo == null) {
      throw new NotFoundException([
        `${didOfvmId} not found`,
        `${didOfvmId} is not owned by the appId ${appDetail.appId}`,
        `Resource not found`,
      ]);
    }
    Logger.log(
      'create() method: initialising hypersignSchema',
      'SchemaService',
    );

    try {
      // Issuer Identity: - used for authenticating credenital
      const appVault = await getAppVault(kmsId, edvId);
      const { mnemonic: authorMnemonic } = await appVault.getDecryptedDocument(
        didInfo.kmsId,
      );
      const seed = await this.hidWallet.getSeedFromMnemonic(authorMnemonic);
      const hypersignDid = new HypersignDID();
      const { privateKeyMultibase } = await hypersignDid.generateKeys({ seed });

      // Apps Identity: - used for gas fee
      const appMenemonic = await getAppMenemonic(kmsId);
      const hypersignSchema =
        await this.schemaSSIservice.initiateHypersignSchema(
          appMenemonic,
          namespace,
        );

      Logger.log(
        'create() method generating new using hypersignSchema',
        'SchemaService',
      );

      const generatedSchema = await hypersignSchema.generate(schema);
      Logger.log('create() method: signing new schema', 'SchemaService');
      const signedSchema = await hypersignSchema.sign({
        privateKeyMultibase,
        schema: generatedSchema,
        verificationMethodId: verificationMethodId,
      });
      Logger.log(
        'create() method: registering new schema to the blockchain',
        'SchemaService',
      );

      const { wallet, address } = await this.hidWallet.generateWallet(
        appMenemonic,
      );
      let registeredSchema;
      const isDevMode = this.config.get('NODE_ENV') === 'development';
      if (!isDevMode && (await this.checkAllowence(address))) {
        await this.txnService.sendSchemaTxn(
          generatedSchema,
          signedSchema.proof,
          appMenemonic,
          appDetail,
        );
      } else {
        registeredSchema = await hypersignSchema.register({
          schema: signedSchema,
        });
      }

      Logger.log(
        'create() method: storing schema information to DB',
        'SchemaService',
      );
      await this.schemaRepository.create({
        schemaId: signedSchema.id,
        appId: appDetail.appId,
        authorDid: author,
        transactionHash: registeredSchema?.transactionHash
          ? registeredSchema.transactionHash
          : '',
      });
      Logger.log('create() method: ends', 'SchemaService');

      return {
        schemaId: signedSchema.id,
        transactionHash: registeredSchema?.transactionHash
          ? registeredSchema.transactionHash
          : '',
      };
    } catch (error) {
      Logger.error(
        `SchemaService: create() method: Error occuered ${error.message}`,
        'SchemaService',
      );
      throw new BadRequestException([error.message]);
    }
  }

  async getSchemaList(appDetial, paginationOption): Promise<Schemas[]> {
    Logger.log('getSchemaList() method: starts....', 'SchemaService');

    const skip = (paginationOption.page - 1) * paginationOption.limit;
    paginationOption['skip'] = skip;
    Logger.log(
      'getSchemaList() method: fetching data from DB',
      'SchemaService',
    );

    const schemaList = await this.schemaRepository.find({
      appId: appDetial.appId,
      paginationOption,
    });
    if (schemaList.length <= 0) {
      Logger.error(
        'getSchemaList() method: no schema found in db ',
        'SchemaService',
      );

      throw new NotFoundException([
        `No schema has created for appId ${appDetial.appId}`,
      ]);
    }
    Logger.log('getSchemaList() method: ends....', 'SchemaService');

    return schemaList;
  }

  async resolveSchema(schemaId: string) {
    Logger.log('resolveSchema() method: starts....', 'SchemaService');
    Logger.log(
      'resolveSchema() method: creating instance of hypersign schema',
      'SchemaService',
    );

    const hypersignSchema = new HypersignSchema();
    Logger.log(
      'resolveSchema() method: resolving schema from blockchain',
      'SchemaService',
    );

    const statusResponse = await this.statusService.findBySsiId(schemaId);
    if (statusResponse) {
      const firstResponse = statusResponse[0];
      if (firstResponse && firstResponse.data) {
        if (firstResponse.data.findIndex((x) => x['status'] != 0) >= 0) {
          throw new BadRequestException([firstResponse]);
        }
      }
    }

    let resolvedSchema;
    try {
      resolvedSchema = await hypersignSchema.resolve({ schemaId });
    } catch (e) {
      Logger.error(e);
    }
    if (
      !resolvedSchema ||
      Object.keys(resolvedSchema).length == 0 ||
      !resolvedSchema.schema
    ) {
      Logger.error(
        'resolveSchema() method: Error whilt resolving schema schemaId' +
          schemaId,
        'SchemaService',
      );
      const tempResolvedDid = {
        id: schemaId,
      };
      return tempResolvedDid;
    }

    try {
      resolvedSchema.schema.properties = JSON.parse(
        resolvedSchema.schema?.properties,
      );
    } catch (e) {
      Logger.log(
        'resolveSchema() method: Error in parsing schema properties',
        'SchemaService',
      );
    }
    Logger.log('resolveSchema() method: ends....', 'SchemaService');

    return resolvedSchema;
  }

  async registerSchema(
    registerSchemaDto: RegisterSchemaDto,
    appDetail,
  ): Promise<any> {
    Logger.log('registerSchema() method: starts....', 'SchemaService');

    const { edvId, kmsId } = appDetail;
    const { schemaDocument, schemaProof } = registerSchemaDto;
    Logger.log('registerSchema() method: initialising edv service ');

    const didOfvmId = schemaProof.verificationMethod.split('#')[0];
    const didInfo = await this.didRepositiory.findOne({
      appId: appDetail.appId,
      did: didOfvmId,
    });
    if (!didInfo || didInfo == null) {
      throw new NotFoundException([
        `${didOfvmId} not found`,
        `${didOfvmId} is not owned by the appId ${appDetail.appId}`,
        `Resource not found`,
      ]);
    }

    const appMenemonic = await getAppMenemonic(kmsId);
    const namespace =
      (this.config.get<Namespace>('HID_NETWORK_NAMESPACE') as Namespace) ??
      Namespace.mainnet;
    Logger.log('registerSchema() method: initialising hypersignSchema');
    Logger.log('registerSchema() method: initialising hypersignSchema');

    const hypersignSchema = await this.schemaSSIservice.initiateHypersignSchema(
      appMenemonic,
      namespace,
    );
    schemaDocument['proof'] = schemaProof;
    Logger.log('registerSchema() method: registering schema on the blockchain');
    let registeredSchema;
    try {
      const { wallet, address } = await this.hidWallet.generateWallet(
        appMenemonic,
      );
      const isDevMode = this.config.get('NODE_ENV') === 'development';
      if (!isDevMode && (await this.checkAllowence(address))) {
        await this.txnService.sendSchemaTxn(
          registerSchemaDto.schemaDocument,
          registerSchemaDto.schemaProof,
          appMenemonic,
          appDetail,
        );
      } else {
        registeredSchema = await hypersignSchema.register({
          schema: schemaDocument,
        });
      }
    } catch (e) {
      Logger.error('registerSchema() method: Error while registering schema');
      throw new BadRequestException([e.message]);
    }
    Logger.log('registerSchema() method: ends....', 'SchemaService');

    return {
      transactionHash: registeredSchema?.transactionHash
        ? registeredSchema.transactionHash
        : '',
    };
  }
}
