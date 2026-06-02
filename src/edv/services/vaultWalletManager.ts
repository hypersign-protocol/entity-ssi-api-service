import { Bip39, EnglishMnemonic } from '@cosmjs/crypto';
import { Logger } from '@nestjs/common';

import { X25519KeyAgreementKey2020 } from '@digitalbazaar/x25519-key-agreement-key-2020';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';

type authenticationKeyType = {
  id: string;
  controller: string;
  publicKeyMultibase: string;
  privateKeyMultibase: string;
  '@context': string;
};
export class VaultWallet {
  private mnemonic: EnglishMnemonic;
  didDocument: any;
  keys: any;
  keyAgreementKey: any;
  authenticationKey: authenticationKeyType;
  ed25519Signer: any;
  x25519Signer: any;
  keyResolver: any;
  constructor(mnemonic: EnglishMnemonic | string) {
    this.mnemonic =
      typeof mnemonic === 'string'
        ? (mnemonic as unknown as EnglishMnemonic)
        : mnemonic;
  }

  private logStart(fn: string, description: string) {
    const start = performance.now();
    Logger.log(`Starting ${fn}() - ${description}`, `VaultWallet.${fn}`);
    return start;
  }

  private logEnd(fn: string, start: number) {
    const elapsed = (performance.now() - start).toFixed(2);
    Logger.log(`${fn} finished in ${elapsed}ms`, `VaultWallet.${fn}`);
  }

  async Initialize() {
    const start = this.logStart(
      'Initialize',
      'derive vault wallet keys and DID document from mnemonic',
    );
    try {
      const seedEntropy = Bip39.decode(this.mnemonic);

      this.keys = await globalThis.hsSSIdkInstance.did.generateKeys({
        seed: seedEntropy,
      });

      this.didDocument = await globalThis.hsSSIdkInstance.did.generate({
        publicKeyMultibase: this.keys.publicKeyMultibase,
      });

      this.authenticationKey = {
        '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
        id:
          this.didDocument.id.split('#')[0] +
          '#' +
          this.keys.publicKeyMultibase,
        controller: this.didDocument.id,
        publicKeyMultibase: this.keys.publicKeyMultibase,
        privateKeyMultibase: this.keys.privateKeyMultibase,
      };

      this.ed25519Signer = await Ed25519VerificationKey2020.from(
        this.authenticationKey,
      );

      this.x25519Signer =
        await X25519KeyAgreementKey2020.fromEd25519VerificationKey2020({
          keyPair: {
            publicKeyMultibase: this.keys.publicKeyMultibase,
            privateKeyMultibase: this.keys.privateKeyMultibase,
          },
        });

      this.x25519Signer.id =
        this.didDocument.id.split('#')[0] +
        '#' +
        this.x25519Signer.publicKeyMultibase;

      // TODO: confued between x25519Signer & keyAgreementKey
      this.keyAgreementKey = {
        id:
          this.didDocument.id.split('#')[0] +
          '#' +
          this.x25519Signer.publicKeyMultibase,
        type: 'X25519KeyAgreementKey2020',
        publicKeyMultibase: this.x25519Signer.publicKeyMultibase,
        privateKeyMultibase: this.x25519Signer.privateKeyMultibase,
      };

      this.keyResolver = async ({ id }: { id: string }) => {
        // Resolve the key from the DID Document or from the blockchain or from any other source
        // sample authentication key after did resolution
        // Caution: This is just a sample snippet (This will cause error). You should resolve the key from the DID Document or from the blockchain or from any other source

        const authenticationKey = {
          '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
          id:
            this.didDocument.id.split('#')[0] +
            '#' +
            this.keys.publicKeyMultibase,
          controller: this.didDocument.id,
          publicKeyMultibase: this.keys.publicKeyMultibase,
        };
        const ed25519 = await Ed25519VerificationKey2020.from(
          authenticationKey,
        );
        return ed25519;
      };
      return this;
    } finally {
      this.logEnd('Initialize', start);
    }
  }
}

export class VaultWalletManager {
  private static logStart(fn: string, description: string) {
    const start = performance.now();
    Logger.log(`Starting ${fn}() - ${description}`, `VaultWalletManager.${fn}`);
    return start;
  }

  private static logEnd(fn: string, start: number) {
    const elapsed = (performance.now() - start).toFixed(2);
    Logger.log(`${fn} finished in ${elapsed}ms`, `VaultWalletManager.${fn}`);
  }

  static async getWallet(
    mnemonic: EnglishMnemonic | string,
  ): Promise<VaultWallet> {
    const start = this.logStart(
      'getWallet',
      'create and initialize a vault wallet',
    );
    try {
      return new VaultWallet(mnemonic).Initialize();
    } finally {
      this.logEnd('getWallet', start);
    }
  }
}
