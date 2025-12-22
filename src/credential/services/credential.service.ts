import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCredentialDto,
  ResolveCredentialMetadata,
} from '../dto/create-credential.dto';
import { UpdateCredentialDto } from '../dto/update-credential.dto';
import { ConfigService } from '@nestjs/config';
import { CredentialSSIService } from './credential.ssi.service';
import { HidWalletService } from 'src/hid-wallet/services/hid-wallet.service';
import { CredentialRepository } from '../repository/credential.repository';
import { DidRepository } from 'src/did/repository/did.repository';
import {
  HypersignDID,
  HypersignVerifiableCredential,
  IKeyType,
} from 'hs-ssi-sdk';
import { VerifyCredentialDto } from '../dto/verify-credential.dto';
import {
  RegisterCredentialStatusDto,
  SupportedSignatureType,
} from '../dto/register-credential.dto';
import { getAppVault, getAppMenemonic } from '../../utils/app-vault-service';
import { TxSendModuleService } from 'src/tx-send-module/tx-send-module.service';
import * as NodeCache from 'node-cache';
import { StatusService } from 'src/status/status.service';
const myCache = new NodeCache();
@Injectable()
export class CredentialService {
  constructor(
    private readonly config: ConfigService,
    private readonly credentialSSIService: CredentialSSIService,
    private readonly hidWallet: HidWalletService,
    private credentialRepository: CredentialRepository,
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

  async create(createCredentialDto: CreateCredentialDto, appDetail) {
    Logger.log('create() method: starts....', 'CredentialService');
    const {
      schemaId,
      subjectDid,
      schemaContext,
      type,
      issuerDid,
      expirationDate,
      fields,
      verificationMethodId,
      persist,
    } = createCredentialDto;
    let { registerCredentialStatus } = createCredentialDto;
    const nameSpace = createCredentialDto.namespace;
    const didOfvmId = verificationMethodId.split('#')[0]; // issuer's did

    const { edvId, kmsId } = appDetail;
    Logger.log(
      'create() method: before initialising edv service',
      'CredentialService',
    );

    // await this.edvService.init(edvId);
    // Step 1: Fist find the issuer exists or not
    Logger.log({
      appId: appDetail.appId,
      didOfvmId,
    });
    const didInfo = await this.didRepositiory.findOne({
      appId: appDetail.appId,
      did: didOfvmId,
    });
    if (!didInfo || didInfo == null) {
      Logger.error(
        'create() method: Error: No issuer did found',
        'CredentialService',
      );
      throw new NotFoundException([
        `${verificationMethodId} not found`,
        `${verificationMethodId} is not owned by the appId ${appDetail.appId}`,
        `Resource not found`,
      ]);
    }

    Logger.log(
      'create() method: before generating Hid wallet',
      'CredentialService',
    );

    try {
      // Issuer Identity: - used for authenticating credenital
      const appVault = await getAppVault(kmsId, edvId);
      const { mnemonic: issuerMnemonic } = await appVault.getDecryptedDocument(
        didInfo.kmsId,
      );
      const seed = await this.hidWallet.getSeedFromMnemonic(issuerMnemonic);
      const hypersignDid = new HypersignDID();
      let didDocument;
      if (myCache.has(issuerDid)) {
        didDocument = myCache.get(issuerDid);
        console.log('Getting from Cache');
      } else {
        const resp = await hypersignDid.resolve({ did: issuerDid });
        didDocument = resp.didDocument;
        myCache.set(issuerDid, didDocument);
        Logger.log('Setting Cache');
      }
      const verificationMethod = didDocument.verificationMethod.find(
        (vm) => vm.id === verificationMethodId,
      );
      // Apps Identity: - used for gas fee
      const appMenemonic = await getAppMenemonic(kmsId);
      let privateKeyMultibase;
      let hypersignVC;
      if (!verificationMethod) {
        throw new Error(
          `VerificationMethod does not exists for vmId ${verificationMethodId}`,
        );
      }
      if (
        verificationMethod &&
        verificationMethod.type === IKeyType.Ed25519VerificationKey2020
      ) {
        const key = await hypersignDid.generateKeys({ seed });
        privateKeyMultibase = key.privateKeyMultibase;
        hypersignVC = await this.credentialSSIService.initateHypersignVC(
          appMenemonic,
          nameSpace,
        );
      } else if (
        verificationMethod &&
        verificationMethod.type === IKeyType.BabyJubJubKey2021
      ) {
        const key = await hypersignDid.bjjDID.generateKeys({
          mnemonic: issuerMnemonic,
        });
        privateKeyMultibase = key.privateKeyMultibase;
        hypersignVC = await this.credentialSSIService.initateHypersignBjjVC(
          appMenemonic,
          nameSpace,
        );
      }

      let credential;

      if (schemaId) {
        credential = await hypersignVC.generate({
          schemaId,
          subjectDid,
          issuerDid,
          fields,
          expirationDate,
        });
      } else {
        if (!schemaContext || !type) {
          throw new BadRequestException([
            'schemaContext and type is required to create a schema',
          ]);
        }
        Logger.log(
          'create() method: generating hypersignVC',
          'CredentialService',
        );
        credential = await hypersignVC.generate({
          schemaContext,
          type,
          subjectDid,
          issuerDid,
          fields,
          expirationDate,
        });
      }
      Logger.log(
        'create() method: before calling hypersignVC.issue',
        'CredentialService',
      );
      if (registerCredentialStatus == undefined) {
        registerCredentialStatus = true;
      }
      const {
        signedCredential,
        credentialStatus,
        credentialStatusRegistrationResult,
      } = await hypersignVC.issue({
        credential,
        issuerDid,
        issuerDidDoc: didDocument,
        verificationMethodId,
        privateKeyMultibase,
        registerCredential: false,
      });
      const credStatusTemp = {};
      Object.assign(credStatusTemp, credentialStatus);

      const credStatus = {
        credentialStatus,
        namespace: nameSpace,
      } as RegisterCredentialStatusDto;
      if (registerCredentialStatus) {
        await this.registerCredentialStatus(credStatus, appDetail);
      }

      let edvData = undefined;
      if (persist) {
        const creedential = {
          ...signedCredential,
        };
        const creedentialEdvDoc = appVault.prepareEdvDocument(creedential, [
          {
            index: 'content.id',
            unique: true,
          },
          {
            index: 'content.issuer',
            unique: false,
          },
          {
            index: 'content.credentialSubject.id',
            unique: false,
          },
          ,
        ]);
        edvData = await appVault.insertDocument(creedentialEdvDoc);
      }
      Logger.log(
        'create() method: before creating credential doc in db',
        'CredentialService',
      );
      const credentialDetail = await this.credentialRepository.create({
        appId: appDetail.appId,
        credentialId: signedCredential.id,
        issuerDid,
        persist: persist,
        edvDocId: edvData && edvData.id ? edvData.id : '',
        transactionHash: credentialStatusRegistrationResult
          ? credentialStatusRegistrationResult.transactionHash
          : '',
        type: { schemaType: signedCredential.type[1], schemaId }, // TODO : MAYBE REMOVE HARDCODING MAYBE NOT
        registerCredentialStatus: registerCredentialStatus
          ? registerCredentialStatus
          : false,
      });
      Logger.log('create() method: ends....', 'CredentialService');

      const metadata = {
        credentialId: credentialDetail.credentialId,
        persist: credentialDetail.persist,
        type: credentialDetail.type,
        issuerDid: credentialDetail.issuerDid,
        registerCredentialStatus: credentialDetail.registerCredentialStatus,
      } as ResolveCredentialMetadata;

      return {
        credentialDocument: signedCredential,
        credentialStatus: credStatusTemp,
        metadata,
      };
    } catch (e) {
      throw new BadRequestException([e.message]);
    }
  }

  async findAll(appDetail, paginationOption) {
    Logger.log('findAll() method: starts....', 'CredentialService');
    const skip = (paginationOption.page - 1) * paginationOption.limit;
    paginationOption['skip'] = skip;
    Logger.log('findAll() method: fetching data from db', 'CredentialService');
    return await this.credentialRepository.find({
      appId: appDetail.appId,
      paginationOption,
    });
  }

  async resolveCredential(
    credentialId: string,
    appDetail,
    retrieveCredential: boolean,
  ) {
    Logger.log('resolveCredential() method: starts....', 'CredentialService');

    const credentialDetail = await this.credentialRepository.findOne({
      appId: appDetail.appId,
      credentialId,
    });
    if (!credentialDetail || credentialDetail == null) {
      Logger.error(
        'resolveCredential() method: Error: Credential not found',
        'CredentialService',
      );
      throw new NotFoundException([
        `${credentialId} is not found`,
        `${credentialId} does not belongs to the App id: ${appDetail.appId}`,
      ]);
    }
    let credential;
    if (credentialDetail.persist === true && retrieveCredential === true) {
      const { edvId, kmsId } = appDetail;
      Logger.log(
        'resolveCredential() method: before initialising edv service',
        'CredentialService',
      );
      const appVault = await getAppVault(kmsId, edvId);
      const signedCredential = await appVault.getDecryptedDocument(
        credentialDetail.edvDocId,
      );
      credential = signedCredential;
    }
    Logger.log(
      'resolveCredential() method: before initialising HypersignVerifiableCredential',
      'CredentialService',
    );

    const metadata = {
      credentialId: credentialDetail.credentialId,
      persist: credentialDetail.persist,
      type: credentialDetail.type,
      issuerDid: credentialDetail.issuerDid,
      registerCredentialStatus: credentialDetail.registerCredentialStatus,
    } as ResolveCredentialMetadata;
    let credentialStatus = undefined;
    // If user had registered the credential on the blockchain
    // Only then we will go ahead with credential status retrival
    const shouldRetriveCredential = credentialDetail.registerCredentialStatus
      ? credentialDetail.registerCredentialStatus
      : true; // making default true for backwards compatibility
    if (shouldRetriveCredential) {
      /// First check this transaction was successful in lcoal db or there was some error
      const statusResponse = await this.statusService.findBySsiId(credentialId);
      let wasTransactionSuccess = false;
      if (statusResponse) {
        const firstResponse = statusResponse[0];
        if (
          firstResponse &&
          firstResponse.data &&
          firstResponse.totalCount.length > 0
        ) {
          metadata['transactionStatus'] = firstResponse.data;
          if (firstResponse.data.findIndex((x) => x['status'] == 0) >= 0) {
            wasTransactionSuccess = true;
          }
        }
      }

      console.log({ wasTransactionSuccess });
      /// Retrive status from the blockchain only when status = 0, otherwise skip
      if (wasTransactionSuccess) {
        try {
          const hypersignCredential = new HypersignVerifiableCredential();
          credentialStatus = await hypersignCredential.resolveCredentialStatus({
            credentialId,
          });
        } catch (e) {
          credentialStatus = undefined;
        }
        Logger.log('resolveCredential() method: ends....', 'CredentialService');
      }
    }

    return {
      credentialDocument: credential ? credential : undefined,
      credentialStatus,
      metadata,
    };
  }

  async update(
    id: string,
    updateCredentialDto: UpdateCredentialDto,
    appDetail,
  ) {
    Logger.log('update() method: starts....', 'CredentialService');

    const { status, statusReason, issuerDid, namespace, verificationMethodId } =
      updateCredentialDto;
    const statusChange =
      status === 'SUSPEND'
        ? 'SUSPENDED'
        : status === 'REVOKE'
        ? 'REVOKED'
        : 'LIVE';
    const didOfvmId = verificationMethodId.split('#')[0];

    const { edvId, kmsId } = appDetail;
    Logger.log(
      'update() method: before initialising edv service',
      'CredentialService',
    );
    const didInfo = await this.didRepositiory.findOne({
      appId: appDetail.appId,
      did: didOfvmId,
    });
    if (!didInfo || didInfo == null) {
      Logger.error(
        'update() method: Error: didInfo not found',
        'CredentialService',
      );

      throw new NotFoundException([
        `${verificationMethodId} not found`,
        `${verificationMethodId} is not owned by the appId ${appDetail.appId}`,
        `Resource not found`,
      ]);
    }

    try {
      // Issuer Identity: - used for authenticating credenital
      const appVault = await getAppVault(kmsId, edvId);
      const { mnemonic: issuerMnemonic } = await appVault.getDecryptedDocument(
        didInfo.kmsId,
      );
      const seed = await this.hidWallet.getSeedFromMnemonic(issuerMnemonic);
      let hypersignVC;
      const hypersignDid = new HypersignDID();
      const { didDocument } = await hypersignDid.resolve({ did: issuerDid });
      const verificationMethod = didDocument.verificationMethod.find(
        (vm) => vm.id === verificationMethodId,
      );
      let privateKeyMultibase;
      const appMenemonic = await getAppMenemonic(kmsId);
      const nameSpace = namespace
        ? namespace
        : this.config.get('HID_NETWORK_NAMESPACE')
        ? this.config.get('HID_NETWORK_NAMESPACE')
        : namespace;
      if (
        verificationMethod &&
        verificationMethod.type === IKeyType.BabyJubJubKey2021
      ) {
        const key = await hypersignDid.bjjDID.generateKeys({
          mnemonic: issuerMnemonic,
        });
        privateKeyMultibase = key.privateKeyMultibase;
        hypersignVC = await this.credentialSSIService.initateHypersignBjjVC(
          appMenemonic,
          nameSpace,
        );
      } else {
        const key = await hypersignDid.generateKeys({ seed });
        privateKeyMultibase = key.privateKeyMultibase;
        hypersignVC = await this.credentialSSIService.initateHypersignVC(
          appMenemonic,
          nameSpace,
        );
      }
      // Apps Identity: - used for gas fee

      Logger.log(
        'update() method: before calling hypersignVC.resolveCredentialStatus to resolve cred status',
        'CredentialService',
      );
      const credentialStatus = await hypersignVC.resolveCredentialStatus({
        credentialId: id,
      });
      Logger.log(
        'update() method: before calling hypersignVC.updateCredentialStatus to update cred status on chain',
        'CredentialService',
      );

      const { wallet, address } = await this.hidWallet.generateWallet(
        appMenemonic,
      );
      let updatedCredResult;
      if (await this.checkAllowence(address)) {
        const updateCredenital: any = await hypersignVC.updateCredentialStatus({
          credentialStatus,
          issuerDid,
          verificationMethodId,
          privateKeyMultibase,
          status: statusChange,
          statusReason,
          readonly: true,
        });

        await this.txnService.sendUpdateVC(
          updateCredenital?.credentialStatus,
          updateCredenital?.proofValue,
          appMenemonic,
          appDetail,
        );
      } else {
        updatedCredResult = await hypersignVC.updateCredentialStatus({
          credentialStatus,
          issuerDid,
          verificationMethodId,
          privateKeyMultibase,
          status: statusChange,
          statusReason,
          readonly: false,
        });
      }

      await this.credentialRepository.findOneAndUpdate(
        { appId: appDetail.appId, credentialId: id },
        {
          transactionHash: updatedCredResult?.transactionHash
            ? updatedCredResult?.transactionHash
            : '',
        },
      );
      Logger.log('update() method: ends....', 'CredentialService');

      return await hypersignVC.resolveCredentialStatus({
        credentialId: id,
      });
    } catch (e) {
      Logger.error(`update() method: Error ${e.message}`, 'CredentialService');
      throw new BadRequestException([e.message]);
    }
  }

  async verfiyCredential(verifyCredentialDto: VerifyCredentialDto, appDetail) {
    Logger.log('verfiyCredential() method: starts....', 'CredentialService');
    const { id, issuer } = verifyCredentialDto.credentialDocument;
    const credentialDetail = await this.credentialRepository.findOne({
      appId: appDetail.appId,
      credentialId: id,
    });
    if (!credentialDetail || credentialDetail == null) {
      Logger.error(
        'verfiyCredential() method: Error: Credential not found',
        'CredentialService',
      );

      throw new NotFoundException([
        `${id} is not found`,
        `${id} does not belongs to the App id: ${appDetail.appId}`,
      ]);
    }
    const issuerDetail = await this.didRepositiory.findOne({
      appId: appDetail.appId,
      did: issuer,
    });
    if (!issuerDetail || issuerDetail == null) {
      Logger.error(
        'verfiyCredential() method: Error: did not found',
        'CredentialService',
      );

      throw new NotFoundException([
        `${issuerDetail.did} is not found`,
        `${issuerDetail.did} does not belongs to the App id: ${appDetail.appId}`,
      ]);
    }
    const hypersignCredential = new HypersignVerifiableCredential();
    let verificationResult;
    try {
      Logger.log(
        'verfiyCredential() method: before calling hypersignVC.verify to verify credential',
        'CredentialService',
      );
      if (
        verifyCredentialDto.credentialDocument &&
        verifyCredentialDto.credentialDocument.proof.type ===
          SupportedSignatureType.BJJSignature2021
      ) {
        verificationResult = await hypersignCredential.bjjVC.verify({
          credential: verifyCredentialDto.credentialDocument as any, // will fix it latter
          issuerDid: issuer,
          verificationMethodId:
            verifyCredentialDto.credentialDocument.proof.verificationMethod,
        });
      } else {
        verificationResult = await hypersignCredential.verify({
          credential: verifyCredentialDto.credentialDocument as any, // will fix it latter
          issuerDid: issuer,
          verificationMethodId:
            verifyCredentialDto.credentialDocument.proof.verificationMethod,
        });
      }
    } catch (e) {
      Logger.error(
        `verfiyCredential() method: Error:${e.message}`,
        'CredentialService',
      );
      throw new BadRequestException([e.message]);
    }
    Logger.log('verfiyCredential() method: ends....', 'CredentialService');

    return verificationResult;
  }

  // TODO: need to tested
  async registerCredentialStatus(
    registerCredentialDto: RegisterCredentialStatusDto,
    appDetail,
  ) {
    Logger.log(
      'registerCredentialStatus() method: starts....',
      'CredentialService',
    );

    const { credentialStatus, namespace } = registerCredentialDto;
    const credentialId = credentialStatus.id;
    const { kmsId } = appDetail;
    Logger.log(
      'registerCredentialStatus() method: initialising edv service',
      'CredentialService',
    );
    let registeredVC: { transactionHash: string };
    try {
      const appMenemonic = await getAppMenemonic(kmsId);
      Logger.log(
        'registerCredentialStatus() method: before calling hypersignVC.registerCredentialStatus to register credential status on chain',
        'CredentialService',
      );

      const { proof } = credentialStatus;

      delete credentialStatus['proof'];

      const { wallet, address } = await this.hidWallet.generateWallet(
        appMenemonic,
      );
      let hypersignVC;
      if (
        proof &&
        proof.type &&
        proof.type === SupportedSignatureType.BJJSignature2021
      ) {
        hypersignVC = await this.credentialSSIService.initateHypersignBjjVC(
          appMenemonic,
          namespace,
        );
      } else {
        hypersignVC = await this.credentialSSIService.initateHypersignVC(
          appMenemonic,
          namespace,
        );
      }
      Logger.log(`Address: ${address}`);
      const isDevMode = this.config.get('NODE_ENV') === 'development';
      if (!isDevMode && (await this.checkAllowence(address))) {
        await this.txnService.sendVCTxn(
          credentialStatus,
          proof,
          appMenemonic,
          appDetail,
        );
      } else {
        registeredVC = await hypersignVC.registerCredentialStatus({
          credentialStatus,
          credentialStatusProof: proof,
        });
      }
    } catch (e) {
      Logger.error(
        `registerCredentialStatus() method: Error ${e.message}`,
        'CredentialService',
      );
      throw new BadRequestException([e.message]);
    }
    Logger.log(
      'registerCredentialStatus() method: ends....',
      'CredentialService',
    );
    return { transactionHash: registeredVC?.transactionHash };
  }
}
