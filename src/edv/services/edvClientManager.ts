import { HypersignEdvClientEd25519VerificationKey2020 } from 'hypersign-edv-client';
import {
  IResponse,
  IEncryptionRecipents,
} from 'hypersign-edv-client/build/Types';
import { VaultWallet } from './vaultWalletManager';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EDVDocType = {
  document: object;
  documentId?: string;
  sequence?: number;
  metadata?: object;
  edvId: string;
  recipients?: Array<IEncryptionRecipents>;
  indexs?: Array<{ index: string; unique: boolean }>;
};

export interface IEdvClientManager {
  didDocument: object;
  edvId?: string;
  initate(): Promise<IEdvClientManager>;
  insertDocument(doc: EDVDocType): any;
  updateDocument(): any;
  deleteDocument(): any;
  getDecryptedDocument(id: string): Promise<any>;
  getDocument(id: string): Promise<IResponse>;
  prepareEdvDocument(
    content: object,
    indexes: Array<{ index: string; unique: boolean }>,
    recipients?: Array<IEncryptionRecipents>,
  ): EDVDocType;
}

export class EdvClientManger implements IEdvClientManager {
  didDocument: any;
  edvId?: string;
  private keyResolver: any;
  private vault: any;
  private recipient: any;
  private vaultWallet: VaultWallet;
  private config: ConfigService;
  constructor(vaultWallet: VaultWallet, edvId?: string) {
    this.vaultWallet = vaultWallet;
    this.edvId = edvId;
    this.didDocument = this.vaultWallet.didDocument;
    this.keyResolver = this.vaultWallet.keyResolver;
    this.config = new ConfigService();
  }

  private logStart(fn: string, description: string) {
    const start = performance.now();
    Logger.debug(`Starting ${fn}() - ${description}`, `EdvClientManger.${fn}`);
    return start;
  }

  private logEnd(fn: string, start: number) {
    const elapsed = (performance.now() - start).toFixed(2);
    Logger.debug(`${fn} finished in ${elapsed}ms`, `EdvClientManger.${fn}`);
  }

  async initate(): Promise<IEdvClientManager> {
    const start = this.logStart(
      'initate',
      'initialize EDV client and register the encrypted data vault',
    );
    try {
      const ed25519 = this.vaultWallet.ed25519Signer;
      const x25519 = this.vaultWallet.ed25519Signer;
      const keyAgreementKey = this.vaultWallet.keyAgreementKey;

      this.recipient = [
        {
          ...keyAgreementKey,
          publicKeyMultibase: x25519.publicKeyMultibase,
        },
      ];

      const EDV_BASE_URL = this.config.get('EDV_BASE_URL');
      Logger.debug('EDV_BASE_URL = ' + EDV_BASE_URL, 'edvClientManager');
      this.vault = new HypersignEdvClientEd25519VerificationKey2020({
        keyResolver: this.keyResolver,
        url: EDV_BASE_URL,
        ed25519VerificationKey2020: ed25519,
        x25519KeyAgreementKey2020: x25519,
      });

      const config = {
        url: EDV_BASE_URL,
        keyAgreementKey,
        controller: this.vaultWallet.authenticationKey.id,
        edvId: this.edvId
          ? this.edvId
          : 'urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66',
      };

      await this.vault.registerEdv(config);
      return this;
    } finally {
      this.logEnd('initate', start);
    }
  }

  prepareEdvDocument(
    content: object,
    indexes: Array<{ index: string; unique: boolean }>,
    recipients?: Array<IEncryptionRecipents>,
  ): EDVDocType {
    const start = this.logStart(
      'prepareEdvDocument',
      'prepare encrypted data vault document payload',
    );
    try {
      const document: any = {
        document: { content },
        edvId: this.edvId,
        indexs: indexes,
        recipients: recipients ? recipients : this.recipient,
      };
      return document;
    } finally {
      this.logEnd('prepareEdvDocument', start);
    }
  }

  async insertDocument(doc: EDVDocType): Promise<{ id: string }> {
    const start = this.logStart(
      'insertDocument',
      'insert an encrypted document into the EDV',
    );
    try {
      if (doc['recipients'] && doc['recipients'].length !== 0) {
        doc['recipients'].push(this.recipient[0]);
      } else {
        doc['recipients'] = this.recipient;
      }
      const resp: IResponse = await this.vault.insertDoc({ ...doc });

      if (!resp || !resp.document?.id) {
        Logger.error(JSON.stringify(resp), 'edvClientManager');
        throw new Error('Could not insert document');
      }
      return {
        id: resp.document.id,
      };
    } finally {
      this.logEnd('insertDocument', start);
    }
  }

  updateDocument(): any {
    throw new Error('not implemented');
  }
  deleteDocument(): any {
    throw new Error('not implemented');
  }

  async getDocument(id: string): Promise<IResponse> {
    const start = this.logStart(
      'getDocument',
      'fetch encrypted document from EDV client',
    );
    try {
      Logger.log(
        'getDocument() method: starts, fetching docs from edvClient',
        'EdvService',
      );
      const resp: IResponse = await this.vault.fetchDoc({
        edvId: this.edvId,
        documentId: id,
      });
      return resp;
    } finally {
      this.logEnd('getDocument', start);
    }
  }

  async getDecryptedDocument(id: string): Promise<any> {
    const start = this.logStart(
      'getDecryptedDocument',
      'fetch and decrypt a document from the EDV',
    );
    try {
      Logger.log('getDecryptedDocument() method: starts....', 'EdvService');

      Logger.log(
        'getDecryptedDocument() method: fetching doc from edvCLient',
        'EdvService',
      );

      const doc: IResponse = await this.getDocument(id);
      if (!doc.document) {
        throw new Error(doc.message);
      }

      Logger.log(
        'getDecryptedDocument() method: decrypting doc using edvClient',
        'EdvService',
      );

      const { content } = await this.vault.decryptObject({
        keyAgreementKey: this.vaultWallet.x25519Signer,
        jwe: doc.document.jwe,
      });
      Logger.log('getDecryptedDocument() method: ends....', 'EdvService');

      return content;
    } finally {
      this.logEnd('getDecryptedDocument', start);
    }
  }
}
