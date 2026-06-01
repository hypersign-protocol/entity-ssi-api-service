import { Injectable, Scope, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HypersignVerifiableCredential,
  HypersignBJJVerifiableCredential,
} from 'hs-ssi-sdk';
import { HidWalletService } from 'src/hid-wallet/services/hid-wallet.service';

@Injectable({ scope: Scope.REQUEST })
export class CredentialSSIService {
  constructor(
    private readonly config: ConfigService,
    private readonly hidWallet: HidWalletService,
  ) {}

  private logStart(fn: string, description: string) {
    const start = performance.now();
    Logger.log(
      `Starting ${fn}() - ${description}`,
      `CredentialSSIService.${fn}`,
    );
    return start;
  }

  private logEnd(fn: string, start: number) {
    const elapsed = (performance.now() - start).toFixed(2);
    Logger.log(`${fn} finished in ${elapsed}ms`, `CredentialSSIService.${fn}`);
  }

  async initateHypersignVC(
    mnemonic: string,
    namespace: string,
  ): Promise<HypersignVerifiableCredential> {
    const start = this.logStart(
      'initateHypersignVC',
      'initialize a Hypersign verifiable credential client for Ed25519',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      Logger.log(
        'InitateHypersignVC() method: before getting offlinesigner',
        'CredentialSSIService',
      );
      await this.hidWallet.generateWallet(mnemonic);
      const offlineSigner = this.hidWallet.getOfflineSigner();
      const hypersignVC = new HypersignVerifiableCredential({
        offlineSigner,
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });

      // await hypersignVC.init();
      return hypersignVC;
    } finally {
      this.logEnd('initateHypersignVC', start);
    }
  }

  async initateHypersignBjjVC(mnemonic: string, namespace: string) {
    const start = this.logStart(
      'initateHypersignBjjVC',
      'initialize a Hypersign verifiable credential client for BabyJubJub',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      Logger.log(
        'InitateHypersignVC() method: before getting offlinesigner',
        'CredentialSSIService',
      );
      await this.hidWallet.generateWallet(mnemonic);
      const offlineSigner = this.hidWallet.getOfflineSigner();
      const hypersignVC = new HypersignBJJVerifiableCredential({
        offlineSigner,
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });
      // await hypersignVC.init();
      return hypersignVC;
    } finally {
      this.logEnd('initateHypersignBjjVC', start);
    }
  }
}
