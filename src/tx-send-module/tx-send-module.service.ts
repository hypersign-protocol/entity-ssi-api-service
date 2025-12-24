import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import {
  MsgRegisterDID,
  MsgRegisterCredentialStatus,
  MsgUpdateCredentialStatus,
  MsgUpdateDID,
  MsgDeactivateDID,
  MsgRegisterCredentialSchema,
} from 'hs-ssi-sdk/build/libs/generated/ssi/tx';
import { DidSSIService } from 'src/did/services/did.ssi.service';
import { HidWalletService } from 'src/hid-wallet/services/hid-wallet.service';
import { StdFee } from '@cosmjs/stargate';
import {
  MsgExec,
  MsgGrant,
  MsgRevoke,
} from 'cosmjs-types/cosmos/authz/v1beta1/tx';

@Injectable()
export class TxSendModuleService {
  private channel: ChannelWrapper;
  private granterAddress;
  constructor(
    private readonly configService: ConfigService,
    private readonly hidWalletService: HidWalletService,
    private readonly didSSIService: DidSSIService,
  ) {
    this.connect();
  }

  async invokeTxnController(address, granteeMnemonic, appDetail) {
    const podENV = {
      RMQ_URL: this.configService.get('RABBIT_MQ_URI'),
      QUEUE_NAME: 'TXN_QUEUE_' + address,
      NODE_RPC_URL: this.configService.get('HID_NETWORK_RPC'),
      GRANTEE_MNEMONIC: granteeMnemonic,
      GRANTER_ADDRESS: this.granterAddress,
      DID_REGISTER_FIXED_FEE: '50',
      CRED_REGISTER_FIXED_FEE: '50',
      SCHEMA_CREATE_FIXED_FEE: '50',
      ESTIMATE_GAS_PRICE: '155303',
      podName: 'txn-dynamic',
      granteeWalletAddress: address,
      tenent: appDetail.subdomain,
      Tx_Query_API:
        this.configService.get('Tx_Query_API') ||
        'https://hypersign-testnet-api.polkachu.com/cosmos/tx/v1beta1/txs/',
    };

    await this.channel.assertQueue('GLOBAL_TXN_CONTROLLER_QUEUE', {
      durable: false,
    });
    const sendToQueue2 = await this.channel.sendToQueue(
      this.configService.get('GLOBAL_TXN_CONTROLLER_QUEUE'),
      Buffer.from(JSON.stringify(podENV)),
    );
  }

  async prepareMsgCreateDID(
    didDocument,
    didDocumentSigned,
    verificationMethodIdOrArray,
    txAuthor,
  ): Promise<MsgRegisterDID> {
    const verificationMethods = Array.isArray(verificationMethodIdOrArray)
      ? verificationMethodIdOrArray
      : [{ verification_method_id: verificationMethodIdOrArray }];
    const didDocumentProofs = [];
    for (const { verification_method_id } of verificationMethods) {
      const proof = didDocumentSigned?.find((e) => {
        return e.verification_method_id === verification_method_id;
      });
      const vm = didDocument.verificationMethod?.find((e) => {
        return e.id == verification_method_id;
      });
      if (!vm) {
        throw new Error(
          `Verification method ${verification_method_id} not found in DID document`,
        );
      }

      let signatureType = '';
      let proofPurpose = '';
      switch (vm.type) {
        case 'Ed25519VerificationKey2020': {
          signatureType = 'Ed25519Signature2020';
          proofPurpose = 'assertionMethod';
          break;
        }
        case 'BabyJubJubKey2021': {
          signatureType = 'BJJSignature2021';
          proofPurpose = 'assertionMethod';
          break;
        }
        default: {
          throw Error(`${vm.type} type is not matched`);
        }
      }

      if (proof) {
        didDocumentProofs.push({
          verificationMethod: verification_method_id,
          type: signatureType,
          proofPurpose: proofPurpose,
          created: proof.created,
          proofValue: proof.signature,
        });
      } else {
        throw new Error(
          `Proof for verification method ${verification_method_id} not found`,
        );
      }
    }

    return MsgRegisterDID.fromPartial({
      didDocument: didDocument,
      didDocumentProofs,
      txAuthor: txAuthor,
    });
  }

  async connect() {
    try {
      Logger.log('Connecting Rabbit');
      const connection = await amqp.connect(
        this.configService.get('RABBIT_MQ_URI'),
      );
      connection.on('error', (err) => {
        console.error('Connection error:', err);
      });

      connection.on('close', () => {
        Logger.error('Connection closed, reconnecting...', 'RabbitMQ');
      });
      this.channel = await connection.createChannel();
      this.channel.on('error', (err) => {
        Logger.error(err, 'RabbitMQ');
      });

      const { address: granterAddress } =
        await this.hidWalletService.generateWallet(
          this.configService.get('MNEMONIC'),
        );
      this.granterAddress = granterAddress;
      Logger.log('Connected Rabbit');
    } catch (error) {
      Logger.error(error, 'RabbitMQ');
    }
  }

  async prepareRegisterCredentialStatus(
    credentialStatus,
    credentialStatusProof,
    txAuthor,
  ) {
    return MsgRegisterCredentialStatus.fromPartial({
      credentialStatusDocument: credentialStatus,
      credentialStatusProof: credentialStatusProof,
      txAuthor,
    });
  }

  async prepareUpdateCredentialStatus(credentialStatus, proofValue, address) {
    return MsgUpdateCredentialStatus.fromPartial({
      credentialStatusDocument: credentialStatus,
      credentialStatusProof: proofValue,
      txAuthor: address,
    });
  }

  async sendUpdateVC(credentialStatus, proofValue, granteeMnemonic, appDetail) {
    if (!this.channel) {
      await this.connect();
    }
    const { wallet, address } = await this.hidWalletService.generateWallet(
      granteeMnemonic,
    );
    const msgUpdateCredentialStatus = await this.prepareUpdateCredentialStatus(
      credentialStatus,
      proofValue,
      address,
    );

    const authExecMsg: MsgExec = {
      grantee: address,
      msgs: [
        {
          typeUrl: '/hypersign.ssi.v1.MsgUpdateCredentialStatus',
          value: MsgUpdateCredentialStatus.encode(
            msgUpdateCredentialStatus,
          ).finish(),
        },
      ],
    };

    const fee = {
      amount: [
        {
          denom: 'uhid',
          amount: '100',
        },
      ],
      gas: '500000',
      granter: this.granterAddress, // NOTE: It is VERY IMPORTANT to explicitly pass granter's address
    };

    const txMsg = {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: authExecMsg,
    };

    const data = {
      type: 'CRED_UPDATE',
      txMsg,
    };

    const queue = 'TXN_QUEUE_' + address;
    await this.channel.assertQueue(queue, {
      durable: false,
    });

    const sendToQueue1 = await this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(data)),
    );

    await this.invokeTxnController(address, granteeMnemonic, appDetail);
  }

  async sendVCTxn(
    credentialStatus,
    credentialStatusProof,
    granteeMnemonic,
    appDetail,
  ) {
    if (!this.channel) {
      await this.connect();
    }
    const { wallet, address } = await this.hidWalletService.generateWallet(
      granteeMnemonic,
    );

    const msgRegisterCredentialStatus =
      await this.prepareRegisterCredentialStatus(
        credentialStatus,
        credentialStatusProof,
        address,
      );
    const authExecMsg: MsgExec = {
      grantee: address,
      msgs: [
        {
          typeUrl: '/hypersign.ssi.v1.MsgRegisterCredentialStatus',
          value: MsgRegisterCredentialStatus.encode(
            msgRegisterCredentialStatus,
          ).finish(),
        },
      ],
    };

    const fee = {
      amount: [
        {
          denom: 'uhid',
          amount: '100',
        },
      ],
      gas: '500000',
      granter: this.granterAddress, // NOTE: It is VERY IMPORTANT to explicitly pass granter's address
    };

    const txMsg = {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: authExecMsg,
    };

    const data = {
      type: 'CRED_REGISTER',
      txMsg,
    };

    const queue = 'TXN_QUEUE_' + address;
    await this.channel.assertQueue(queue, {
      durable: false,
    });

    const sendToQueue1 = await this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(data)),
    );

    await this.invokeTxnController(address, granteeMnemonic, appDetail);
  }

  async prepareMsgUpdateDID(didDocument, signInfos, versionId, txAuthor) {
    return MsgUpdateDID.fromPartial({
      didDocument,
      didDocumentProofs: signInfos,
      versionId,
      txAuthor,
    });
  }

  async sendDIDDeactivate(
    didDocument: any,
    signInfos: any,
    versionId: any,
    granteeMnemonic: any,
    appDetail,
  ) {
    Logger.log(
      'Inside  sendDIDDeactivate to deactivate the did.',
      'TxSendModuleService',
    );

    if (!this.channel) {
      await this.connect();
    }

    const { wallet, address } = await this.hidWalletService.generateWallet(
      granteeMnemonic,
    );
    const msgDeactivateDID = await this.prepareMsgDeactivateDID(
      didDocument,
      signInfos,
      versionId,
      address,
    );

    const authExecMsg: MsgExec = {
      grantee: address,
      msgs: [
        {
          typeUrl: '/hypersign.ssi.v1.MsgDeactivateDID',
          value: MsgDeactivateDID.encode(msgDeactivateDID).finish(),
        },
      ],
    };

    const fee = {
      amount: [
        {
          denom: 'uhid',
          amount: '100',
        },
      ],
      gas: '500000',
      granter: this.granterAddress, // NOTE: It is VERY IMPORTANT to explicitly pass granter's address
    };
    const txMsg = {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: authExecMsg,
    };
    const queue = 'TXN_QUEUE_' + address;
    await this.channel.assertQueue(queue, {
      durable: false,
    });

    const data = {
      type: 'DID_DEACTIVATE',
      txMsg,
    };
    const sendToQueue1 = await this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(data)),
    );

    await this.invokeTxnController(address, granteeMnemonic, appDetail);
  }
  prepareMsgDeactivateDID(
    didDocument: any,
    signInfos: any,
    versionId: any,
    address: string,
  ) {
    return MsgDeactivateDID.fromPartial({
      didDocumentId: didDocument.id,
      didDocumentProofs: signInfos,
      txAuthor: address,
      versionId,
    });
  }

  async sendDIDUpdate(
    didDocument,
    signInfos,
    versionId,
    granteeMnemonic,
    appDetail,
  ) {
    if (!this.channel) {
      await this.connect();
    }

    const { wallet, address } = await this.hidWalletService.generateWallet(
      granteeMnemonic,
    );
    const msgUpdateDID = await this.prepareMsgUpdateDID(
      didDocument,
      signInfos,
      versionId,
      address,
    );
    const authExecMsg: MsgExec = {
      grantee: address,
      msgs: [
        {
          typeUrl: '/hypersign.ssi.v1.MsgUpdateDID',
          value: MsgUpdateDID.encode(msgUpdateDID).finish(),
        },
      ],
    };

    const fee = {
      amount: [
        {
          denom: 'uhid',
          amount: '100',
        },
      ],
      gas: '500000',
      granter: this.granterAddress, // NOTE: It is VERY IMPORTANT to explicitly pass granter's address
    };
    const txMsg = {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: authExecMsg,
    };
    const queue = 'TXN_QUEUE_' + address;
    await this.channel.assertQueue(queue, {
      durable: false,
    });

    const data = {
      type: 'DID_UPDATE',
      txMsg,
    };
    const sendToQueue1 = await this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(data)),
    );

    await this.invokeTxnController(address, granteeMnemonic, appDetail);
  }

  async sendDIDTxn(
    didDocument,
    didDocumentSigned,
    verificationMethodId,
    granteeMnemonic,
    appDetail,
  ) {
    if (!this.channel) {
      await this.connect();
    }

    const { wallet, address } = await this.hidWalletService.generateWallet(
      granteeMnemonic,
    );
    const msgCreateDID = await this.prepareMsgCreateDID(
      didDocument,
      didDocumentSigned,
      verificationMethodId,
      address,
    );
    const authExecMsg: MsgExec = {
      grantee: address,
      msgs: [
        {
          typeUrl: '/hypersign.ssi.v1.MsgRegisterDID',
          value: MsgRegisterDID.encode(msgCreateDID).finish(),
        },
      ],
    };
    const fee = {
      amount: [
        {
          denom: 'uhid',
          amount: '100',
        },
      ],
      gas: '500000',
      granter: this.granterAddress, // NOTE: It is VERY IMPORTANT to explicitly pass granter's address
    };
    const txMsg = {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: authExecMsg,
    };
    const queue = 'TXN_QUEUE_' + address;
    await this.channel.assertQueue(queue, {
      durable: false,
    });

    const data = {
      type: 'DID_REGISTER',
      txMsg,
    };
    const sendToQueue1 = await this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(data)),
    );

    await this.invokeTxnController(address, granteeMnemonic, appDetail);
  }

  prepareSchemaMsg(schema, proof, txAuthor) {
    return MsgRegisterCredentialSchema.fromPartial({
      credentialSchemaDocument: schema,
      credentialSchemaProof: proof,
      txAuthor: txAuthor,
    });
  }

  async sendSchemaTxn(schema, proof, granteeMnemonic, appDetail) {
    if (!this.channel) {
      await this.connect();
    }

    const { wallet, address } = await this.hidWalletService.generateWallet(
      granteeMnemonic,
    );
    const msgSchema = await this.prepareSchemaMsg(schema, proof, address);

    const authExecMsg: MsgExec = {
      grantee: address,
      msgs: [
        {
          typeUrl: '/hypersign.ssi.v1.MsgRegisterCredentialSchema',
          value: MsgRegisterCredentialSchema.encode(msgSchema).finish(),
        },
      ],
    };
    const fee = {
      amount: [
        {
          denom: 'uhid',
          amount: '100',
        },
      ],
      gas: '500000',
      granter: this.granterAddress, // NOTE: It is VERY IMPORTANT to explicitly pass granter's address
    };
    const txMsg = {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: authExecMsg,
    };
    const queue = 'TXN_QUEUE_' + address;
    await this.channel.assertQueue(queue, {
      durable: false,
    });

    const data = {
      type: 'SCHEMA_REGISTER',
      txMsg,
    };
    const sendToQueue1 = await this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(data)),
    );

    await this.invokeTxnController(address, granteeMnemonic, appDetail);
    return sendToQueue1;
  }
}
