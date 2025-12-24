import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePresentationTemplateDto } from '../dto/create-presentation-templete.dto';
import { UpdatePresentationDto } from '../dto/update-presentation.dto';
import { PresentationTemplateRepository } from '../repository/presentation-template.repository';
import { PresentationTemplate } from '../schemas/presentation-template.schema';
import {
  CreatePresentationDto,
  CreatePresentationRequestDto,
} from '../dto/create-presentation-request.dto';
import {
  HypersignVerifiablePresentation,
  HypersignDID,
  IVerifiableCredential,
  IVerifiablePresentation,
  IKeyType,
} from 'hs-ssi-sdk';
import { ConfigService } from '@nestjs/config';
import { HidWalletService } from 'src/hid-wallet/services/hid-wallet.service';
import {
  DidMetaDataRepo,
  DidRepository,
} from 'src/did/repository/did.repository';
import { VerifyPresentationDto } from '../dto/verify-presentation.dto';
import { getAppVault } from '../../utils/app-vault-service';
import { generateAppId } from 'src/utils/utils';
import { VerificationMethodRelationships } from 'hs-ssi-sdk/build/libs/generated/ssi/client/enums';
import { DidSSIService } from 'src/did/services/did.ssi.service';
import { DidService } from 'src/did/services/did.service';
@Injectable()
export class PresentationService {
  constructor(
    private readonly presentationtempleteReopsitory: PresentationTemplateRepository,
  ) {}
  async createPresentationTemplate(
    createPresentationTemplateDto: CreatePresentationTemplateDto,
    appDetail,
  ): Promise<PresentationTemplate> {
    Logger.log(
      'createPresentationTemplate() method: starts....',
      'PresentationService',
    );

    const { domain, name, query } = createPresentationTemplateDto;
    const templateDetail = await this.presentationtempleteReopsitory.findOne({
      appId: appDetail.appId,
      name,
    });
    if (templateDetail) {
      throw new BadRequestException([
        `Template name must be unique`,
        `${name} already exists`,
      ]);
    }
    const newPresentationTemplate = this.presentationtempleteReopsitory.create({
      appId: appDetail.appId,
      domain,
      query,
      name,
    });
    Logger.log(
      'createPresentationTemplate() method: ends....',
      'PresentationService',
    );

    return newPresentationTemplate;
  }

  async fetchListOfPresentationTemplate(
    paginationOption,
    appDetail,
  ): Promise<PresentationTemplate[]> {
    Logger.log(
      'fetchListOfPresentationTemplate() method: starts....',
      'PresentationService',
    );

    const skip = (paginationOption.page - 1) * paginationOption.limit;
    paginationOption['skip'] = skip;
    const templateList = await this.presentationtempleteReopsitory.find({
      appId: appDetail.appId,
      paginationOption,
    });
    // if (templateList.length <= 0) {
    //   throw new NotFoundException([
    //     `No template has created for appId ${appDetail.appId}`,
    //   ]);
    // }
    Logger.log(
      'fetchListOfPresentationTemplate() method: ends....',
      'PresentationService',
    );

    return templateList;
  }

  async fetchAPresentationTemplate(
    templateId: string,
    appDetail,
  ): Promise<PresentationTemplate> {
    Logger.log(
      'fetchAPresentationTemplate() method: starts....',
      'PresentationService',
    );
    const templateDetail = await this.presentationtempleteReopsitory.findOne({
      appId: appDetail.appId,
      _id: templateId,
    });
    if (!templateDetail || templateDetail == null) {
      throw new NotFoundException([
        `Resource not found`,
        `${templateId} does not belongs to the App id : ${appDetail.appId}`,
      ]);
    }
    Logger.log(
      'fetchAPresentationTemplate() method: ends....',
      'PresentationService',
    );

    return templateDetail;
  }

  async updatePresentationTemplate(
    templateId: string,
    updatePresentationDto: UpdatePresentationDto,
    appDetail,
  ): Promise<PresentationTemplate> {
    Logger.log(
      'updatePresentationTemplate() method: starts....',
      'PresentationService',
    );

    const { domain, name, query } = updatePresentationDto;
    const templateDetail = await this.presentationtempleteReopsitory.findOne({
      appId: appDetail.appId,
      name,
      _id: { $ne: templateId },
    });
    if (templateDetail) {
      throw new BadRequestException([
        `Template name must be unique`,
        `${name} already exists`,
      ]);
    }
    const updatedresult = this.presentationtempleteReopsitory.findOneAndUpdate(
      {
        _id: templateId,
        appId: appDetail.appId,
      },
      {
        domain,
        query,
        name,
        appId: appDetail.appId,
      },
    );
    Logger.log(
      'updatePresentationTemplate() method: ends....',
      'PresentationService',
    );

    return updatedresult;
  }

  async deletePresentationTemplate(
    templateId: string,
    appDetail,
  ): Promise<PresentationTemplate> {
    Logger.log(
      'updatePresentationTemplate() method: starts....',
      'PresentationService',
    );

    let templateDetail = await this.presentationtempleteReopsitory.findOne({
      appId: appDetail.appId,
      _id: templateId,
    });
    if (!templateDetail) {
      throw new NotFoundException([
        `No resource found for templateId ${templateId}`,
      ]);
    }
    templateDetail = await this.presentationtempleteReopsitory.findOneAndDelete(
      {
        appId: appDetail.appId,
        _id: templateId,
      },
    );
    Logger.log(
      'updatePresentationTemplate() method: ends....',
      'PresentationService',
    );

    return templateDetail;
  }
}

@Injectable()
export class PresentationRequestService {
  constructor(
    private readonly presentationtempleteReopsitory: PresentationTemplateRepository,
    private readonly didRepositiory: DidRepository,
    private readonly didMetaRepositiory: DidMetaDataRepo,
    private readonly didService: DidService,
    private readonly config: ConfigService,
    private readonly hidWallet: HidWalletService,
    private readonly didSSIService: DidSSIService,
  ) {}
  async createPresentationRequest(
    createPresentationRequestDto: CreatePresentationRequestDto,
    appDetail,
  ) {
    Logger.log(
      'createPresentationRequest() method: starts....',
      'PresentationRequestService',
    );

    const { challenge, did, templateId, expiresTime, callbackUrl } =
      createPresentationRequestDto;
    let presentationTemplete = undefined;
    try {
      presentationTemplete = await this.presentationtempleteReopsitory.findOne({
        appId: appDetail.appId,
        _id: templateId,
      });
    } catch (error) {
      Logger.error(
        `createPresentationRequest() method: Error:${error.message}`,
        'PresentationRequestService',
      );

      throw new BadRequestException([`templeteId : ${templateId} not found`]);
    }

    const body = presentationTemplete;
    body.challenge = challenge;

    const response = {
      id: await generateAppId(),
      from: did,
      created_time: Number(new Date()),
      expires_time: expiresTime,
      reply_url: callbackUrl,
      reply_to: [did],
      body,
    };
    Logger.log(
      'createPresentationRequest() method: ends....',
      'PresentationRequestService',
    );

    return response;
  }
  async createPresentation(
    CreatePresentationDto: CreatePresentationDto,
    appDetail,
  ) {
    Logger.log(
      'createPresentation() method: starts....',
      'PresentationRequestService',
    );

    Logger.log(
      'createPresentation() method: before initializing HypersignVerifiablePresentation and HypersignDID',
      'PresentationRequestService',
    );

    const hypersignVP = new HypersignVerifiablePresentation({
      nodeRestEndpoint: this.config.get('HID_NETWORK_API'),
      nodeRpcEndpoint: this.config.get('HID_NETWORK_RPC'),
      namespace: 'testnet',
    });

    const hypersignDID = new HypersignDID({
      nodeRestEndpoint: this.config.get('HID_NETWORK_API'),
      nodeRpcEndpoint: this.config.get('HID_NETWORK_RPC'),
      namespace: 'testnet',
    });

    const {
      credentialDocuments,
      holderDid,
      challenge,
      verificationMethodId,
      domain,
    } = CreatePresentationDto;
    Logger.log(
      'createPresentation() method: before calling hypersignVP.generate',
      'PresentationRequestService',
    );

    // TODO:  domain should be concidered
    const unsignedverifiablePresentation = await hypersignVP.generate({
      verifiableCredentials: credentialDocuments as any,
      holderDid: holderDid,
    });
    const { didDocument } = await hypersignDID.resolve({
      did: holderDid,
    });
    if (Object.keys(didDocument).length == 0) {
      const did = await this.didService.resolveDid(appDetail, holderDid);
      Object.assign(didDocument, did.didDocument);
    }

    const verificationMethodIdforAssert =
      verificationMethodId || didDocument.assertionMethod[0];
    Logger.log(
      'createPresentation() method: initialising edv service',
      'PresentationRequestService',
    );
    const didInfo = await this.didRepositiory.findOne({
      appId: appDetail.appId,
      did: verificationMethodIdforAssert.split('#')[0],
    });
    if (!didInfo || didInfo == null) {
      throw new NotFoundException([
        `${verificationMethodIdforAssert} not found`,
        `${verificationMethodIdforAssert} is not owned by the appId ${appDetail.appId}`,
        `Resource not found`,
      ]);
    }
    // Holder Identity: - used for authenticating presentation
    const { edvId, kmsId } = appDetail;
    const appVault = await getAppVault(kmsId, edvId);

    const vmWithAssertion = didDocument.verificationMethod.find(
      (vm) => vm.id === verificationMethodIdforAssert,
    );

    const { mnemonic: holderMnemonic } = await appVault.getDecryptedDocument(
      didInfo.kmsId,
    );
    const seed = await this.hidWallet.getSeedFromMnemonic(holderMnemonic);
    let hypersignDid;
    let privateKeyMultibase;
    let signedVerifiablePresentation;

    if (
      vmWithAssertion &&
      vmWithAssertion.type === IKeyType.BabyJubJubKey2021
    ) {
      hypersignDid = await this.didSSIService.initiateHyperSignBJJDidOffline(
        this.config.get('HID_NETWORK_NAMESPACE') || '',
      );
      const keys = await hypersignDid.generateKeys({
        mnemonic: holderMnemonic,
      });
      privateKeyMultibase = keys.privateKeyMultibase;
      Logger.log(
        'createPresentation() method: before calling hypersignVP.sign for bjj',
        'PresentationRequestService',
      );

      signedVerifiablePresentation = await hypersignVP.bjjVp.sign({
        presentation: unsignedverifiablePresentation as IVerifiablePresentation,
        // holderDid,
        holderDidDocSigned: didDocument as any,
        verificationMethodId: verificationMethodIdforAssert,
        challenge,
        domain,
        privateKeyMultibase,
      });
    } else {
      hypersignDid = new HypersignDID();
      const keys = await hypersignDid.generateKeys({ seed });
      privateKeyMultibase = keys.privateKeyMultibase;

      Logger.log(
        'createPresentation() method: before calling hypersignVP.sign',
        'PresentationRequestService',
      );
      signedVerifiablePresentation = await hypersignVP.sign({
        presentation: unsignedverifiablePresentation as IVerifiablePresentation,
        // holderDid,
        holderDidDocSigned: didDocument as any,
        domain,
        verificationMethodId: verificationMethodIdforAssert,
        challenge,
        privateKeyMultibase,
      });
      Logger.log(
        'createPresentation() method: ends....',
        'PresentationRequestService',
      );
    }
    return { presentation: signedVerifiablePresentation };
  }

  async verifyPresentation(presentations: VerifyPresentationDto, appDetail) {
    Logger.log(
      'verifyPresentation() method: starts....',
      'PresentationRequestService',
    );

    Logger.log(
      'verifyPresentation() method:before initialising HypersignVerifiablePresentation',
      'PresentationRequestService',
    );

    const hypersignVP = new HypersignVerifiablePresentation({
      nodeRestEndpoint: this.config.get('HID_NETWORK_API'),
      nodeRpcEndpoint: this.config.get('HID_NETWORK_RPC'),
      namespace: 'testnet',
    });
    const { presentation } = presentations;

    const holderDid = presentation['holder'];
    const issuerDid = presentation['verifiableCredential'][0]['issuer'];
    const challenge = presentation['proof']['challenge'];
    const type = presentation['proof']['type'];
    const domain = presentation['proof']['domain'];

    Logger.log(
      'verifyPresentation() method:before calling  hypersignVP.verify',
      'PresentationRequestService',
    );
    const holderDidResolved = await this.didService.resolveDid(
      appDetail,
      holderDid,
    );

    let verifiedPresentationDetail;
    const holderVerificationMethodId =
      presentations.holderVerificationMethodId || holderDid + '#key-1';
    const issuerVerificationMethodId =
      presentations.issuerVerificationMethodId || issuerDid + '#key-1';
    if (type === 'BJJSignature2021') {
      verifiedPresentationDetail = await hypersignVP.bjjVp.verify({
        signedPresentation: presentation as any,
        issuerDid,
        holderDidDocSigned: holderDidResolved.didDocument,
        holderVerificationMethodId: holderVerificationMethodId,
        issuerVerificationMethodId: issuerVerificationMethodId,
        challenge,
        domain,
      });
    } else {
      // holderDidResolved.didDocument.verificationMethod[0].publicKeyMultibase='z6MkuX5ydorS9Hyf6J1Yu4tKPvzLwUpe6TVfATXqn17SvJA4'
      verifiedPresentationDetail = await hypersignVP.verify({
        signedPresentation: presentation as any,
        issuerDid,
        domain,
        holderDidDocSigned: holderDidResolved.didDocument,
        holderVerificationMethodId: holderVerificationMethodId,
        issuerVerificationMethodId: issuerVerificationMethodId,
        challenge,
      });
    }

    Logger.log(
      'verifyPresentation() method: ends....',
      'PresentationRequestService',
    );

    return verifiedPresentationDetail;
  }
}
